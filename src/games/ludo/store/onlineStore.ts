import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { GAME_ID } from '@/games/ludo/constants/app';
import { COLOR_ORDER } from '@/games/ludo/constants/board';
import { applyAction, INITIAL_STATE } from '@/games/ludo/logic/gameReducer';
import type {
  Intent,
  LobbySnapshot,
  NetMessage,
  Seat,
} from '@/games/ludo/net/protocol';
import { reduceIntent } from '@/games/ludo/net/session';
import { createSupabaseTransport } from '@/shared/net/supabaseTransport';
import type { Transport } from '@/shared/net/transport';
import { useGameStore } from '@/games/ludo/store/gameStore';
import { useReactionsStore } from '@/games/ludo/store/reactionsStore';
import { useRoomStore } from '@/shared/store/roomStore';
import { usePrefsStore } from '@/games/ludo/store/prefsStore';
import type { GameState, PlayerColor, PlayerConfig } from '@/games/ludo/types/game';

/**
 * Orchestrates online, host-authoritative multiplayer over a Supabase broadcast
 * channel (`room:{code}`).
 *
 * - The **host** owns the lobby roster and the authoritative game state, runs the
 *   reducer, injects the die, and broadcasts every new snapshot.
 * - A **guest** sends intents and mirrors whatever snapshot arrives.
 *
 * Both feed the received/derived {@link GameState} into `gameStore.applyRemoteState`
 * so the existing game UI renders online play unchanged.
 */

type OnlineMode = 'off' | 'host' | 'guest';
type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

// Heartbeat: every client pings; a player silent for longer than the timeout is
// treated as disconnected (the host decides for guests; guests watch the host).
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
let lastSeen: Record<string, number> = {}; // host: guest id → last-seen ms
let hostLastSeen = 0; // guest: last time we heard from the host
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reaperTimer: ReturnType<typeof setInterval> | null = null;
let settingsUnsub: (() => void) | null = null; // host: watch own fast-mode pref

/** Persisted per-room player id so a returning guest reclaims their seat. */
const roomPidKey = (code: string) => `ludo:online:pid:${code}`;

function makeId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 10);
}

function makeRoomCode(): string {
  // Unambiguous alphabet (no O/0/I/1) for easy sharing by voice.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function seatColorOf(id: string): PlayerColor | null {
  return lobby?.seats.find((s) => s.id === id)?.color ?? null;
}

function nextFreeColor(): PlayerColor | null {
  const taken = new Set(lobby?.seats.map((s) => s.color));
  return COLOR_ORDER.find((c) => !taken.has(c)) ?? null;
}

interface OnlineState {
  mode: OnlineMode;
  status: OnlineStatus;
  roomCode: string | null;
  myId: string;
  myName: string;
  myColor: PlayerColor | null;
  lobby: LobbySnapshot | null;
  /** Colours whose player is currently disconnected (host-computed). */
  disconnected: PlayerColor[];
  /** Guest-side: the host went silent — the match can't continue. */
  hostLost: boolean;
  error: string | null;
}

interface OnlineActions {
  hostRoom: (name: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  /** Take a free colour seat (host applies locally; guest asks the host). */
  pickColor: (color: PlayerColor) => void;
  /** Host only: drop a bot into / remove a bot from a colour seat. */
  addBot: (color: PlayerColor) => void;
  removeBot: (color: PlayerColor) => void;
  /** Host only: rename a seat/player and broadcast it to everyone. */
  renamePlayer: (color: PlayerColor, name: string) => void;
  startGame: () => void;
  submitIntent: (intent: Intent) => void;
  /** Host only: apply an intent on behalf of a colour (used to drive bots). */
  hostDrive: (color: PlayerColor, intent: Intent) => void;
  /** Re-announce presence (e.g. after returning from the background). */
  reannounce: () => void;
  /** Flash an emoji over our base, and to everyone else. */
  sendEmoji: (emoji: string) => void;
  leave: () => void;
}

export type OnlineStore = OnlineState & OnlineActions;

const INITIAL: OnlineState = {
  mode: 'off',
  status: 'idle',
  roomCode: null,
  myId: '',
  myName: '',
  myColor: null,
  lobby: null,
  disconnected: [],
  hostLost: false,
  error: null,
};

export const useOnlineStore = create<OnlineStore>((set, get) => {
  const mirrorLobby = () => {
    const myColor = seatColorOf(get().myId);
    set({
      lobby: lobby ? { ...lobby } : null,
      myColor,
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

  // Host: move an already-seated player to a free colour (no swap/steal).
  const assignSeatColor = (id: string, color: PlayerColor) => {
    if (!lobby) return;
    if (lobby.seats.some((s) => s.color === color)) return; // taken
    if (!lobby.seats.some((s) => s.id === id)) return; // requester not seated
    lobby = {
      ...lobby,
      seats: lobby.seats.map((s) => (s.id === id ? { ...s, color } : s)),
    };
    broadcastLobby();
  };

  const hostHandler = (msg: NetMessage) => {
    if (!lobby) return;
    // Any message from a client means they're alive.
    if ('from' in msg) lastSeen[msg.from] = Date.now();
    if (msg.t === 'ping') return; // liveness only
    if (msg.t === 'emoji') {
      useReactionsStore.getState().show(msg.color, msg.emoji);
      return;
    }
    if (msg.t === 'hello') {
      if (lobby.phase === 'lobby') {
        const already = lobby.seats.some((s) => s.id === msg.from);
        const color = already ? null : nextFreeColor();
        if (color) {
          const seat: Seat = {
            color,
            id: msg.from,
            name: msg.name?.trim() || color,
            type: 'human',
          };
          lobby = { ...lobby, seats: [...lobby.seats, seat] };
        }
        broadcastLobby();
      } else {
        // Playing phase: a (re)joining client. Reconnect them so the match
        // resumes and the "waiting" overlay clears on every device.
        const disc = lobby.disconnected ?? [];
        const seat = lobby.seats.find((s) => s.id === msg.from);
        if (!seat) {
          // Returning with a fresh id: reclaim a disconnected human seat.
          const target = lobby.seats.find(
            (s) => s.type === 'human' && disc.includes(s.color),
          );
          if (target) {
            lobby = {
              ...lobby,
              seats: lobby.seats.map((s) =>
                s.color === target.color
                  ? { ...s, id: msg.from, name: msg.name?.trim() || s.name }
                  : s,
              ),
              disconnected: disc.filter((c) => c !== target.color),
            };
            broadcastLobby();
          }
        } else if (disc.includes(seat.color)) {
          // A known player is back — clear their flag immediately.
          lobby = {
            ...lobby,
            disconnected: disc.filter((c) => c !== seat.color),
          };
          broadcastLobby();
        }
        transport?.send({ t: 'lobby', snapshot: lobby });
        if (hostState) transport?.send({ t: 'state', seq, state: hostState });
      }
    } else if (msg.t === 'pick') {
      if (lobby.phase === 'lobby') assignSeatColor(msg.from, msg.color);
    } else if (msg.t === 'intent') {
      if (!hostState) return;
      const next = reduceIntent(hostState, seatColorOf(msg.from), msg.intent);
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
      // Render the snapshot *before* flipping to 'playing' so /game never sees
      // an empty board.
      useGameStore.getState().applyRemoteState(msg.state);
      set({ status: 'playing', hostLost: false });
    } else if (msg.t === 'ping' && msg.from === lobby?.hostId) {
      hostLastSeen = Date.now();
    } else if (msg.t === 'emoji') {
      useReactionsStore.getState().show(msg.color, msg.emoji);
    }
  };

  // Broadcast our own liveness so peers know we are still here.
  const pingTick = () => {
    transport?.send({ t: 'ping', from: get().myId });
  };

  // Host: mark humans (other than us) silent past the timeout as disconnected.
  const hostReap = () => {
    if (!lobby || lobby.phase !== 'playing') return;
    const now = Date.now();
    const disc = lobby.seats
      .filter((s) => s.type === 'human' && s.id != null && s.id !== lobby!.hostId)
      .filter((s) => now - (lastSeen[s.id!] ?? 0) > DISCONNECT_MS)
      .map((s) => s.color);
    const prev = lobby.disconnected ?? [];
    if (disc.join(',') !== prev.join(',')) {
      lobby = { ...lobby, disconnected: disc };
      broadcastLobby();
    }
  };

  // Guest: notice when the host goes quiet (nothing to sync the match).
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
    settingsUnsub?.();
    transport?.close();
    unsubscribe = null;
    settingsUnsub = null;
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

    hostRoom: async (name) => {
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
          seats: [{ color: 'red', id: myId, name: name.trim() || 'red', type: 'human' }],
          // The host's fast mode governs the whole session (bot waits + roll
          // speed) without touching any guest's own persisted preference.
          fastMode: usePrefsStore.getState().fastMode,
        };
        lastSeen[myId] = Date.now();
        unsubscribe = transport.subscribe(hostHandler);
        // Keep the session's fast mode in step if the host toggles it later.
        settingsUnsub = usePrefsStore.subscribe((state, prev) => {
          if (state.fastMode === prev.fastMode) return;
          if (get().mode !== 'host' || !lobby) return;
          lobby = { ...lobby, fastMode: state.fastMode };
          broadcastLobby();
        });
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
      // Reuse the id we last used in this room so the host recognises our seat
      // and we resume playing (not just spectating) after a reconnect.
      let myId = await AsyncStorage.getItem(roomPidKey(room));
      if (!myId) {
        myId = makeId();
        await AsyncStorage.setItem(roomPidKey(room), myId);
      }
      set({ ...INITIAL, mode: 'guest', status: 'connecting', myId, myName: name, roomCode: room });
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

    pickColor: (color) => {
      const { mode, myId } = get();
      if (mode === 'host') assignSeatColor(myId, color);
      else if (mode === 'guest') transport?.send({ t: 'pick', from: myId, color });
    },

    addBot: (color) => {
      if (get().mode !== 'host' || !lobby) return;
      if (lobby.seats.some((s) => s.color === color)) return; // taken
      lobby = {
        ...lobby,
        seats: [...lobby.seats, { color, id: null, name: 'Bot', type: 'bot' }],
      };
      broadcastLobby();
    },

    removeBot: (color) => {
      if (get().mode !== 'host' || !lobby) return;
      const seat = lobby.seats.find((s) => s.color === color);
      if (!seat || seat.type !== 'bot') return;
      lobby = { ...lobby, seats: lobby.seats.filter((s) => s.color !== color) };
      broadcastLobby();
    },

    renamePlayer: (color, name) => {
      if (get().mode !== 'host') return;
      const trimmed = name.trim();
      // Keep the lobby roster in step so a later restart carries the new name.
      if (lobby?.seats.some((s) => s.color === color)) {
        lobby = {
          ...lobby,
          seats: lobby.seats.map((s) =>
            s.color === color ? { ...s, name: trimmed || s.name } : s,
          ),
        };
        broadcastLobby();
      }
      // Update the authoritative game state (if a match is running) and push it
      // to every device; the empty-name fallback lives in the reducer.
      if (hostState) {
        hostState = applyAction(hostState, {
          type: 'SET_PLAYER_NAME',
          color,
          name,
        });
        broadcastState();
      }
    },

    hostDrive: (color, intent) => {
      if (get().mode !== 'host' || !hostState) return;
      const next = reduceIntent(hostState, color, intent);
      if (next === hostState) return;
      hostState = next;
      broadcastState();
    },

    startGame: () => {
      if (get().mode !== 'host' || !lobby) return;
      const config: PlayerConfig[] = lobby.seats.map((s) => ({
        color: s.color,
        type: s.type,
        name: s.name,
      }));
      hostState = applyAction(INITIAL_STATE, { type: 'START_GAME', config });
      lobby = { ...lobby, phase: 'playing' };
      broadcastLobby();
      broadcastState();
      set({ status: 'playing' });
    },

    submitIntent: (intent) => {
      const { mode, myId, myColor } = get();
      if (mode === 'host') {
        if (!hostState) return;
        const next = reduceIntent(hostState, myColor, intent);
        if (next === hostState) return;
        hostState = next;
        broadcastState();
      } else if (mode === 'guest') {
        transport?.send({ t: 'intent', from: myId, intent });
      }
    },

    reannounce: () => {
      const { mode, myId, myName, status } = get();
      if (status !== 'playing' || mode !== 'guest') return;
      transport?.send({ t: 'hello', from: myId, name: myName });
    },

    sendEmoji: (emoji) => {
      const { myColor } = get();
      if (!myColor) return;
      useReactionsStore.getState().show(myColor, emoji); // show ours immediately
      transport?.send({ t: 'emoji', color: myColor, emoji });
    },

    leave: () => {
      // Intentional exit: forget our seat id so a future join starts fresh.
      const code = get().roomCode;
      if (code) void AsyncStorage.removeItem(roomPidKey(code));
      teardown();
      useGameStore.getState().resetGame();
      set({ ...INITIAL });
    },
  };
});
