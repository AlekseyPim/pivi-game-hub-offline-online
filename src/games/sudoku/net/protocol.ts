import type { Difficulty, GameState } from '@/games/sudoku/types/game';

/**
 * Wire protocol for host-authoritative multiplayer (the same shape as the
 * sibling minesweeper).
 *
 * Sudoku hides nothing — both players look at the same grid — so unlike
 * battleship there is no reason to keep state on each device. One client is the
 * **host**: it owns the lobby and the authoritative {@link GameState}, generates
 * the puzzle, is the only one that runs the reducer. Everyone else is a
 * **guest** that sends *intents* and renders whatever snapshot arrives.
 */

export type PlayerId = string;

export type Intent =
  /** Write a digit, or 0 to clear the cell. */
  | { kind: 'value'; index: number; value: number }
  /** Toggle one pencil mark. */
  | { kind: 'note'; index: number; digit: number }
  /** Wipe the cell: digit and pencil marks. */
  | { kind: 'erase'; index: number };

/** One lobby seat: a slot (0-based, = the cell `owner` value) and its holder. */
export interface Seat {
  slot: number;
  id: PlayerId | null;
  name: string;
}

/** Host-chosen match configuration, mirrored to every guest. */
export interface MatchConfig {
  difficulty: Difficulty;
}

/** The host-owned lobby state. */
export interface LobbySnapshot {
  code: string;
  hostId: PlayerId;
  seats: Seat[];
  phase: 'lobby' | 'playing';
  config: MatchConfig;
  /** Slots whose player has gone quiet (host-computed). */
  disconnected?: number[];
}

export type NetMessage =
  /** guest → host: "I joined" (with display name) / reconnect ping */
  | { t: 'hello'; from: PlayerId; name?: string }
  /** host → all: the current lobby roster + config */
  | { t: 'lobby'; snapshot: LobbySnapshot }
  /** guest → host: act on one of my own cells */
  | { t: 'intent'; from: PlayerId; intent: Intent }
  /** heartbeat so peers track who is still connected */
  | { t: 'ping'; from: PlayerId }
  /** any player → all: a fleeting emoji reaction */
  | { t: 'emoji'; from: PlayerId; emoji: string }
  /** host → all: the new authoritative snapshot (monotonic `seq`) */
  | { t: 'state'; seq: number; state: GameState };
