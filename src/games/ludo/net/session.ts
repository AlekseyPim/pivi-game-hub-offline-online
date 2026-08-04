import { applyAction } from '@/games/ludo/logic/gameReducer';
import type { GameAction } from '@/games/ludo/logic/gameReducer';
import type { Intent, NetMessage, PlayerId } from '@/games/ludo/net/protocol';
import type { Transport } from '@/shared/net/transport';
import type { GameState, PlayerColor } from '@/games/ludo/types/game';

/**
 * The networked game engine, host-authoritative.
 *
 * `createHostSession` owns the authoritative state: it turns incoming (and its
 * own) intents into reducer actions — injecting the authoritative die on a roll —
 * validates that the sender actually owns the current turn, applies them, and
 * broadcasts every new snapshot.
 *
 * `createGuestSession` is a thin shell: it forwards intents to the host and keeps
 * the latest snapshot it receives (ignoring anything stale by `seq`).
 */

const DICE_MIN = 1;
const DICE_MAX = 6;

function rollDie(): number {
  return Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1)) + DICE_MIN;
}

export function intentToAction(intent: Intent): GameAction {
  switch (intent.kind) {
    case 'roll':
      return { type: 'ROLL_DICE', die: rollDie() };
    case 'move':
      return { type: 'MOVE_TOKEN', tokenId: intent.tokenId };
    case 'nextTurn':
      return { type: 'NEXT_TURN' };
  }
}

/**
 * Apply a guest's intent authoritatively: only the colour whose turn it is may
 * act. Returns the SAME state reference when the intent is rejected (wrong turn)
 * or is a no-op, so callers can cheaply detect "nothing changed".
 */
export function reduceIntent(
  state: GameState,
  color: PlayerColor | null,
  intent: Intent,
): GameState {
  if (!color) return state;
  const current = state.players[state.currentPlayerIndex]?.color;
  if (color !== current) return state;
  return applyAction(state, intentToAction(intent));
}

export interface HostSession {
  /** Submit an intent on behalf of the host's own player. */
  submitIntent: (intent: Intent) => void;
  getState: () => GameState;
  close: () => void;
}

export interface HostSessionOptions {
  transport: Transport<NetMessage>;
  hostId: PlayerId;
  initialState: GameState;
  /** Maps a connected player id to the board colour they occupy (null = spectator). */
  seatColorOf: (id: PlayerId) => PlayerColor | null;
  onState: (state: GameState) => void;
}

export function createHostSession(opts: HostSessionOptions): HostSession {
  let state = opts.initialState;
  let seq = 0;

  const broadcast = () => {
    seq += 1;
    opts.transport.send({ t: 'state', seq, state });
    opts.onState(state);
  };

  const applyIntent = (from: PlayerId, intent: Intent) => {
    const next = reduceIntent(state, opts.seatColorOf(from), intent);
    if (next === state) return; // rejected / illegal / no-op
    state = next;
    broadcast();
  };

  const unsubscribe = opts.transport.subscribe((msg) => {
    if (msg.t === 'intent') {
      applyIntent(msg.from, msg.intent);
    } else if (msg.t === 'hello') {
      // A newcomer needs the current snapshot; re-send without advancing seq.
      opts.transport.send({ t: 'state', seq, state });
    }
    // 'state' messages are host output; the host ignores them.
  });

  // Publish the opening position.
  broadcast();

  return {
    submitIntent: (intent) => applyIntent(opts.hostId, intent),
    getState: () => state,
    close: unsubscribe,
  };
}

export interface GuestSession {
  submitIntent: (intent: Intent) => void;
  getState: () => GameState | null;
  close: () => void;
}

export interface GuestSessionOptions {
  transport: Transport<NetMessage>;
  myId: PlayerId;
  onState: (state: GameState) => void;
}

export function createGuestSession(opts: GuestSessionOptions): GuestSession {
  let state: GameState | null = null;
  let lastSeq = -1;

  const unsubscribe = opts.transport.subscribe((msg) => {
    if (msg.t === 'state' && msg.seq > lastSeq) {
      lastSeq = msg.seq;
      state = msg.state;
      opts.onState(msg.state);
    }
    // guests ignore 'intent' / 'hello' from peers
  });

  // Announce ourselves so the host replies with the current snapshot.
  opts.transport.send({ t: 'hello', from: opts.myId });

  return {
    submitIntent: (intent) =>
      opts.transport.send({ t: 'intent', from: opts.myId, intent }),
    getState: () => state,
    close: unsubscribe,
  };
}
