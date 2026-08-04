import type {
  BoardSize,
  Difficulty,
  GameState,
  TurnMode,
} from '@/games/minesweeper/types/game';

/**
 * Wire protocol for host-authoritative multiplayer (same shape as ludo-game).
 *
 * One client is the **host**: it owns the lobby and the authoritative
 * {@link GameState}, is the only one that runs the reducer, and the only one that
 * generates the board. Everyone else is a **guest** that sends *intents* ("reveal
 * this cell / cycle this mark") and renders whatever snapshot the host broadcasts.
 */

export type PlayerId = string;

export type Intent =
  | { kind: 'reveal'; index: number }
  /**
   * A marking action. `mode: 'cycle'` is the long-press none→flag→question→none;
   * `'flag'` / `'question'` toggle just that mark; `'clear'` removes any mark
   * (the mode buttons).
   */
  | { kind: 'mark'; index: number; mode: 'cycle' | 'flag' | 'question' | 'clear' };

/** One lobby seat: a player slot (0-based) and who occupies it. */
export interface Seat {
  /** Stable slot index → the cell `owner` value in the game state. */
  slot: number;
  id: PlayerId | null;
  name: string;
}

/** Host-chosen match configuration, mirrored to every guest. */
export interface MatchConfig {
  size: BoardSize;
  difficulty: Difficulty;
  /** Mine-count multiplier, 1.0–1.5 (see constants/board). */
  mineDensity: number;
  turnMode: TurnMode;
}

/** The host-owned lobby state. */
export interface LobbySnapshot {
  code: string;
  hostId: PlayerId;
  seats: Seat[];
  phase: 'lobby' | 'playing';
  config: MatchConfig;
  /** Slots whose player is currently disconnected (host-computed). */
  disconnected?: number[];
}

export type NetMessage =
  /** guest → host: "I joined" (with display name) / reconnect ping */
  | { t: 'hello'; from: PlayerId; name?: string }
  /** host → all: the current lobby roster + config */
  | { t: 'lobby'; snapshot: LobbySnapshot }
  /** guest → host: act on the sender's turn */
  | { t: 'intent'; from: PlayerId; intent: Intent }
  /** heartbeat so peers track who is still connected */
  | { t: 'ping'; from: PlayerId }
  /** any player → all: a fleeting emoji reaction pinned to a board cell */
  | { t: 'emoji'; from: PlayerId; index: number; emoji: string }
  /** host → all: the new authoritative game snapshot (monotonic `seq`) */
  | { t: 'state'; seq: number; state: GameState };
