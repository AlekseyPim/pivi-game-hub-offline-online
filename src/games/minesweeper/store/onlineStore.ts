import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { GAME_ID } from '@/games/minesweeper/constants/app';
import { MAX_PLAYERS, minesForSize } from '@/games/minesweeper/constants/board';
import { createGame } from '@/games/minesweeper/logic/boardGen';
import type {
  Intent,
  LobbySnapshot,
  MatchConfig,
  NetMessage,
  Seat,
} from '@/games/minesweeper/net/protocol';
import { reduceIntent } from '@/games/minesweeper/net/session';
import { createSupabaseTransport } from '@/shared/net/supabaseTransport';
import type { Transport } from '@/shared/net/transport';
import { useGameStore } from '@/games/minesweeper/store/gameStore';
import { useReactionsStore } from '@/games/minesweeper/store/reactionsStore';
import { useRoomStore } from '@/shared/store/roomStore';
import type { GameState, PlayerConfig } from '@/games/minesweeper/types/game';

/**
 * Orchestrates online, host-authoritative multiplayer over a Supabase broadcast
 * channel (`room:ms:{code}`) — the same architecture as ludo-game.
 *
 * - The **host** owns the lobby roster + match config and the authoritative game
 *   state, generates the board, runs the reducer, and broadcasts every snapshot.
 * - A **guest** sends intents and mirrors whatever snapshot arrives.
 *
 * Both feed the {@link GameState} into `gameStore.applyRemoteState` so the game
 * UI renders online play unchanged.
 */

type OnlineMode = 'off' | 'host' | 'guest';
type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

const PING_MS = 3000;
const DISCONNECT_MS = 8000;
const REAP_MS = 2000;

// Non-reactive session internals (kept out of the reactive store).
let transport: Transport<NetMessage> | null = null;
let unsubscribe: (() => void) | null = null;
let hostState: GameState | null = null;
let lobby: LobbySnapshot | null = null;
let seq = 0;
let lastSeq = -1;
let lastSeen: Record<string, number> = {};
let hostLastSeen = 0;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reaperTimer: ReturnType<typeof setInterval> | null = null;

const DEFAULT_CONFIG: MatchConfig = {
  size: 9,
  difficulty: 'easy',
  mineDensity: 1,
  turnMode: 'parallel',
};

/** Persisted per-room player id so a returning guest reclaims their seat. */
const roomPidKey = (code: string) => `minesweeper:online:pid:${code}`;

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
  disconnected: number[];
  /** Guest-side: the host went silent — the match can't continue. */
  hostLost: boolean;
  error: string | null;
}

interface OnlineActions {
  hostRoom: (name: string, config: MatchConfig) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  /** Host only: change the match config while still in the lobby. */
  setConfig: (patch: Partial<MatchConfig>) => void;
  startGame: () => void;
  /** Host only: regenerate a fresh board with the same lobby config. */
  restart: () => void;
  submitIntent: (intent: Intent) => void;
  /** Flash an emoji over a cell, and to everyone else. */
  sendEmoji: (index: number, emoji: string) => void;
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
  disconnected: [],
  hostLost: false,
  error: null,
};

export const useOnlineStore = create<OnlineStore>((set, get) => {
  const mirrorLobby = () => {
    set({
      lobby: lobby ? { ...lobby } : null,
      mySlot: seatSlotOf(get().myId),
      disconnected: lobby?.disconnected ?? [],
    });
  };

  const broadcastState = () => {
    if (!transport || !hostState) return;
    seq += 1;
    transport.send({ t: 'state', seq, state: hostState });
    useGameStore.getState().applyRemoteState(hostState);
  };

  const broadcastLobby = () => {
    if (!transport || !lobby) return;
    transport.send({ t: 'lobby', snapshot: lobby });
    mirrorLobby();
  };

  // Generate a fresh authoritative board from the current lobby roster + config.
  const buildGame = (): GameState => {
    const seats = [...lobby!.seats].sort((a, b) => a.slot - b.slot);
    const players: PlayerConfig[] = seats.map((s) => ({
      name: s.name.trim() || `Player ${s.slot + 1}`,
    }));
    const { size, difficulty, mineDensity, turnMode } = lobby!.config;
    return createGame({
      size,
      mines: minesForSize(size, mineDensity),
      difficulty,
      turnMode,
      players,
    });
  };

  const hostHandler = (msg: NetMessage) => {
    if (!lobby) return;
    if ('from' in msg) lastSeen[msg.from] = Date.now();
    if (msg.t === 'ping') return;
    if (msg.t === 'emoji') {
      useReactionsStore.getState().show(msg.index, msg.emoji);
      return;
    }
    if (msg.t === 'hello') {
      if (lobby.phase === 'lobby') {
        const already = lobby.seats.some((s) => s.id === msg.from);
        const slot = already ? null : nextFreeSlot();
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
        broadcastLobby();
      } else {
        // Playing phase: a (re)joining client. Reconnect them so the match
        // resumes and any "waiting" overlay clears on every device.
        const disc = lobby.disconnected ?? [];
        const seat = lobby.seats.find((s) => s.id === msg.from);
        if (!seat) {
          // Returning with a fresh id: reclaim a disconnected seat.
          const target = lobby.seats.find((s) => disc.includes(s.slot));
          if (target) {
            lobby = {
              ...lobby,
              seats: lobby.seats.map((s) =>
                s.slot === target.slot
                  ? { ...s, id: msg.from, name: msg.name?.trim() || s.name }
                  : s,
              ),
              disconnected: disc.filter((c) => c !== target.slot),
            };
            broadcastLobby();
          }
        } else if (disc.includes(seat.slot)) {
          lobby = { ...lobby, disconnected: disc.filter((c) => c !== seat.slot) };
          broadcastLobby();
        }
        transport?.send({ t: 'lobby', snapshot: lobby });
        if (hostState) transport?.send({ t: 'state', seq, state: hostState });
      }
    } else if (msg.t === 'intent') {
      if (!hostState) return;
      const next = reduceIntent(hostState, seatSlotOf(msg.from), msg.intent);
      if (next === hostState) return;
      hostState = next;
      broadcastState();
    }
  };

  const guestHandler = (msg: NetMessage) => {
    if (msg.t === 'lobby') {
      hostLastSeen = Date.now();
      lobby = msg.snapshot;
      mirrorLobby();
      if (get().hostLost) set({ hostLost: false });
    } else if (msg.t === 'state') {
      hostLastSeen = Date.now();
      if (msg.seq <= lastSeq) return;
      lastSeq = msg.seq;
      useGameStore.getState().applyRemoteState(msg.state);
      set({ status: 'playing', hostLost: false });
    } else if (msg.t === 'ping' && msg.from === lobby?.hostId) {
      hostLastSeen = Date.now();
    } else if (msg.t === 'emoji') {
      useReactionsStore.getState().show(msg.index, msg.emoji);
    }
  };

  const pingTick = () => {
    transport?.send({ t: 'ping', from: get().myId });
  };

  const hostReap = () => {
    if (!lobby || lobby.phase !== 'playing') return;
    const now = Date.now();
    const disc = lobby.seats
      .filter((s) => s.id != null && s.id !== lobby!.hostId)
      .filter((s) => now - (lastSeen[s.id!] ?? 0) > DISCONNECT_MS)
      .map((s) => s.slot);
    const prev = lobby.disconnected ?? [];
    if (disc.join(',') !== prev.join(',')) {
      lobby = { ...lobby, disconnected: disc };
      broadcastLobby();
    }
  };

  const guestReap = () => {
    if (get().status !== 'playing') return;
    const lost = Date.now() - hostLastSeen > DISCONNECT_MS;
    if (lost !== get().hostLost) set({ hostLost: lost });
  };

  const startTimers = (role: 'host' | 'guest') => {
    stopTimers();
    pingTimer = setInterval(pingTick, PING_MS);
    reaperTimer = setInterval(role === 'host' ? hostReap : guestReap, REAP_MS);
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
    hostState = null;
    lobby = null;
    seq = 0;
    lastSeq = -1;
    lastSeen = {};
    hostLastSeen = 0;
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
        unsubscribe = transport.subscribe(hostHandler);
        startTimers('host');
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
        hostLastSeen = Date.now();
        unsubscribe = transport.subscribe(guestHandler);
        startTimers('guest');
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

    startGame: () => {
      if (get().mode !== 'host' || !lobby) return;
      hostState = buildGame();
      lobby = { ...lobby, phase: 'playing' };
      broadcastLobby();
      broadcastState();
      set({ status: 'playing' });
    },

    restart: () => {
      if (get().mode !== 'host' || !lobby) return;
      useReactionsStore.getState().clear();
      hostState = buildGame();
      broadcastState();
    },

    submitIntent: (intent) => {
      const { mode, myId, mySlot } = get();
      if (mode === 'host') {
        if (!hostState) return;
        const next = reduceIntent(hostState, mySlot, intent);
        if (next === hostState) return;
        hostState = next;
        broadcastState();
      } else if (mode === 'guest') {
        transport?.send({ t: 'intent', from: myId, intent });
      }
    },

    sendEmoji: (index, emoji) => {
      useReactionsStore.getState().show(index, emoji); // show ours immediately
      transport?.send({ t: 'emoji', from: get().myId, index, emoji });
    },

    reannounce: () => {
      const { mode, myId, myName, status } = get();
      if (status !== 'playing' || mode !== 'guest') return;
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
