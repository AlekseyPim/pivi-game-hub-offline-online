import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { GAME_ID } from '@/games/battleship/constants/app';
import { MAX_PLAYERS } from '@/games/battleship/constants/board';
import type {
  LobbySnapshot,
  MatchConfig,
  NetMessage,
  Seat,
} from '@/games/battleship/net/protocol';
import { createSupabaseTransport } from '@/shared/net/supabaseTransport';
import type { Transport } from '@/shared/net/transport';
import { useGameStore } from '@/games/battleship/store/gameStore';
import { useReactionsStore } from '@/games/battleship/store/reactionsStore';
import { useRoomStore } from '@/shared/store/roomStore';
import type { GameMode, ShotReport } from '@/games/battleship/types/game';

/**
 * Online duels over a Supabase broadcast channel (`room:bs:{code}`).
 *
 * The lobby is host-authoritative — the host owns the roster, the room code and
 * the mode, and mirrors them to the guest, exactly like ludo-game.
 *
 * The match is peer-authoritative: each side keeps its own fleet secret,
 * resolves incoming shots on its own sea (`gameStore.resolveIncomingShot`) and
 * replies with just the outcome. Both sides advance the turn from that same
 * outcome, so the two devices stay in step with no referee.
 */

type OnlineMode = 'off' | 'host' | 'guest';
type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'match' | 'error';

const PING_MS = 3000;
const DISCONNECT_MS = 9000;
const REAP_MS = 2000;

// Non-reactive session internals (kept out of the reactive store).
let transport: Transport<NetMessage> | null = null;
let unsubscribe: (() => void) | null = null;
let lobby: LobbySnapshot | null = null;
let lastSeen: Record<string, number> = {};
let opponentLastSeen = 0;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reaperTimer: ReturnType<typeof setInterval> | null = null;

const DEFAULT_CONFIG: MatchConfig = { mode: 'classic' };

/** Persisted per-room player id so a returning guest reclaims their seat. */
const roomPidKey = (code: string) => `battleship:online:pid:${code}`;

function makeId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 10);
}

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function seatSlotOf(id: string): number | null {
  return lobby?.seats.find((s) => s.id === id)?.slot ?? null;
}

function nextFreeSlot(): number | null {
  const taken = new Set(lobby?.seats.map((s) => s.slot));
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}

interface OnlineState {
  mode: OnlineMode;
  status: OnlineStatus;
  roomCode: string | null;
  myId: string;
  myName: string;
  mySlot: number | null;
  lobby: LobbySnapshot | null;
  /** Slot that opens fire once both fleets are ready. */
  first: number;
  /** The opponent has gone silent. */
  opponentLost: boolean;
  error: string | null;
}

interface OnlineActions {
  hostRoom: (name: string, config: MatchConfig) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  /** Host only: change the mode while still in the lobby. */
  setConfig: (patch: Partial<MatchConfig>) => void;
  /** Host only: send everyone to the placement screen. */
  beginMatch: () => void;
  /** Announce that our fleet is arranged (the arrangement itself never leaves). */
  sendReady: () => void;
  /** Fire at a cell of the opponent's sea. */
  sendShot: (index: number) => void;
  /** Publish which of the opponent's hit markers went dim after our manoeuvre. */
  sendStale: (indices: number[]) => void;
  sendEmoji: (emoji: string) => void;
  /** Host only: rematch with fresh fleets. */
  rematch: () => void;
  /** Re-announce presence (e.g. after returning from the background). */
  reannounce: () => void;
  leave: () => void;
}

export type OnlineStore = OnlineState & OnlineActions;

const INITIAL: OnlineState = {
  mode: 'off',
  status: 'idle',
  roomCode: null,
  myId: '',
  myName: '',
  mySlot: null,
  lobby: null,
  first: 0,
  opponentLost: false,
  error: null,
};

export const useOnlineStore = create<OnlineStore>((set, get) => {
  const mirrorLobby = () => {
    set({
      lobby: lobby ? { ...lobby } : null,
      mySlot: seatSlotOf(get().myId),
    });
  };

  const broadcastLobby = () => {
    if (!transport || !lobby) return;
    transport.send({ t: 'lobby', snapshot: lobby });
    mirrorLobby();
  };

  /** Names in slot order, for the game state. */
  const seatNames = (): string[] => {
    const names = ['', ''];
    for (const seat of lobby?.seats ?? []) names[seat.slot] = seat.name;
    return names;
  };

  /** Drop into the placement phase on this device. */
  const startMatch = (first: number, mode: GameMode) => {
    const mySlot = get().mySlot ?? 0;
    const names = seatNames();
    useReactionsStore.getState().clear();
    useGameStore.getState().startOnline({
      mode,
      online: true,
      mySlot,
      players: [
        { name: names[0], bot: false },
        { name: names[1], bot: false },
      ],
    });
    set({ first, status: 'match' });
  };

  /** Open fire as soon as both fleets are arranged. */
  const maybeOpenFire = () => {
    const game = useGameStore.getState();
    if (game.phase !== 'placement') return;
    if (!game.ready[0] || !game.ready[1]) return;
    game.beginPlay(get().first);
  };

  /** Messages that both roles handle the same way — the match itself. */
  const handleMatch = (msg: NetMessage): void => {
    const game = useGameStore.getState();
    const mySlot = get().mySlot ?? 0;

    switch (msg.t) {
      case 'begin':
        startMatch(msg.first, msg.mode);
        break;
      case 'rematch':
        startMatch(msg.first, useGameStore.getState().mode);
        break;
      case 'ready':
        if (msg.slot !== mySlot) {
          game.setEnemyReady(true);
          maybeOpenFire();
        }
        break;
      case 'shot': {
        if (msg.slot === mySlot) break; // our own echo — ignore
        const report: ShotReport | null = game.resolveIncomingShot(
          msg.slot,
          msg.index,
        );
        if (report) {
          transport?.send({
            t: 'result',
            from: get().myId,
            slot: mySlot,
            report,
          });
        }
        break;
      }
      case 'result':
        if (msg.slot !== mySlot) game.applyEnemyReport(msg.report);
        break;
      case 'stale':
        if (msg.slot !== mySlot) game.applyEnemyStale(msg.indices);
        break;
      case 'emoji':
        useReactionsStore.getState().show(msg.emoji, false);
        break;
      default:
        break;
    }
  };

  const hostHandler = (msg: NetMessage) => {
    if (!lobby) return;
    if ('from' in msg) {
      lastSeen[msg.from] = Date.now();
      if (msg.from !== get().myId) opponentLastSeen = Date.now();
    }
    if (msg.t === 'ping') return;

    if (msg.t === 'hello') {
      const already = lobby.seats.some((s) => s.id === msg.from);
      if (!already && lobby.phase === 'lobby') {
        const slot = nextFreeSlot();
        if (slot != null) {
          const seat: Seat = {
            slot,
            id: msg.from,
            name: msg.name?.trim() || `Player ${slot + 1}`,
          };
          lobby = {
            ...lobby,
            seats: [...lobby.seats, seat].sort((a, b) => a.slot - b.slot),
          };
        }
      }
      broadcastLobby();
      return;
    }
    handleMatch(msg);
  };

  const guestHandler = (msg: NetMessage) => {
    if ('from' in msg && msg.from !== get().myId) opponentLastSeen = Date.now();
    if (msg.t === 'lobby') {
      opponentLastSeen = Date.now();
      lobby = msg.snapshot;
      mirrorLobby();
      return;
    }
    if (msg.t === 'ping') return;
    handleMatch(msg);
  };

  const reap = () => {
    const silent = Date.now() - opponentLastSeen > DISCONNECT_MS;
    const inRoom = get().status === 'lobby' || get().status === 'match';
    const hasOpponent = (lobby?.seats.length ?? 0) >= MAX_PLAYERS;
    const lost = inRoom && hasOpponent && silent;
    if (lost !== get().opponentLost) set({ opponentLost: lost });
  };

  const startTimers = () => {
    stopTimers();
    pingTimer = setInterval(() => {
      transport?.send({ t: 'ping', from: get().myId });
    }, PING_MS);
    reaperTimer = setInterval(reap, REAP_MS);
  };

  const stopTimers = () => {
    if (pingTimer) clearInterval(pingTimer);
    if (reaperTimer) clearInterval(reaperTimer);
    pingTimer = null;
    reaperTimer = null;
  };

  const teardown = () => {
    stopTimers();
    unsubscribe?.();
    transport?.close();
    unsubscribe = null;
    transport = null;
    lobby = null;
    lastSeen = {};
    opponentLastSeen = 0;
    // Whatever brought us here — leaving, an error, starting a second room —
    // the connection is gone, so the hub must not keep advertising a code.
    publishRoom(null);
  };

  // The shared settings screen surfaces the room code mid-match, whichever game
  // owns the room — so the hub-level store has to follow this one.
  const publishRoom = (code: string | null) => {
    const room = useRoomStore.getState();
    if (code) room.enterRoom(GAME_ID, code);
    else room.leaveRoom();
  };

  return {
    ...INITIAL,

    hostRoom: async (name, config) => {
      teardown();
      const myId = makeId();
      const code = makeRoomCode();
      set({ ...INITIAL, mode: 'host', status: 'connecting', myId, myName: name });
      try {
        transport = await createSupabaseTransport<NetMessage>(GAME_ID, code);
        lobby = {
          code,
          hostId: myId,
          phase: 'lobby',
          config: config ?? DEFAULT_CONFIG,
          seats: [{ slot: 0, id: myId, name: name.trim() || 'Player 1' }],
        };
        lastSeen[myId] = Date.now();
        opponentLastSeen = Date.now();
        unsubscribe = transport.subscribe(hostHandler);
        startTimers();
        publishRoom(code);
        set({ roomCode: code, status: 'lobby' });
        broadcastLobby();
      } catch (e) {
        teardown();
        set({ status: 'error', error: (e as Error).message });
      }
    },

    joinRoom: async (code, name) => {
      teardown();
      const room = code.trim().toUpperCase();
      let myId = await AsyncStorage.getItem(roomPidKey(room));
      if (!myId) {
        myId = makeId();
        await AsyncStorage.setItem(roomPidKey(room), myId);
      }
      set({
        ...INITIAL,
        mode: 'guest',
        status: 'connecting',
        myId,
        myName: name,
        roomCode: room,
      });
      try {
        transport = await createSupabaseTransport<NetMessage>(GAME_ID, room);
        opponentLastSeen = Date.now();
        unsubscribe = transport.subscribe(guestHandler);
        startTimers();
        publishRoom(room);
        transport.send({ t: 'hello', from: myId, name });
        set({ status: 'lobby' });
      } catch (e) {
        teardown();
        set({ status: 'error', error: (e as Error).message });
      }
    },

    setConfig: (patch) => {
      if (get().mode !== 'host' || !lobby || lobby.phase !== 'lobby') return;
      lobby = { ...lobby, config: { ...lobby.config, ...patch } };
      broadcastLobby();
    },

    beginMatch: () => {
      if (get().mode !== 'host' || !lobby) return;
      const first = Math.random() < 0.5 ? 0 : 1;
      const mode = lobby.config.mode;
      lobby = { ...lobby, phase: 'match' };
      broadcastLobby();
      transport?.send({ t: 'begin', first, mode });
      startMatch(first, mode);
    },

    sendReady: () => {
      const mySlot = get().mySlot ?? 0;
      transport?.send({ t: 'ready', from: get().myId, slot: mySlot });
      maybeOpenFire();
    },

    sendShot: (index) => {
      transport?.send({
        t: 'shot',
        from: get().myId,
        slot: get().mySlot ?? 0,
        index,
      });
    },

    sendStale: (indices) => {
      transport?.send({
        t: 'stale',
        from: get().myId,
        slot: get().mySlot ?? 0,
        indices,
      });
    },

    sendEmoji: (emoji) => {
      useReactionsStore.getState().show(emoji, true);
      transport?.send({ t: 'emoji', from: get().myId, emoji });
    },

    rematch: () => {
      if (get().mode !== 'host') return;
      const first = Math.random() < 0.5 ? 0 : 1;
      transport?.send({ t: 'rematch', first });
      startMatch(first, useGameStore.getState().mode);
    },

    reannounce: () => {
      const { myId, myName, status } = get();
      if (status === 'idle' || status === 'error') return;
      transport?.send({ t: 'hello', from: myId, name: myName });
    },

    leave: () => {
      const code = get().roomCode;
      if (code) void AsyncStorage.removeItem(roomPidKey(code));
      teardown();
      useReactionsStore.getState().clear();
      useGameStore.getState().resetGame();
      set({ ...INITIAL });
    },
  };
});
