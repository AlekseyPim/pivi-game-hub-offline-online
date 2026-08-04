/**
 * Core domain types for the Ludo game.
 *
 * These are intentionally framework-agnostic: no React, no Zustand, no Reanimated.
 * The store, rules and UI all depend on these types — never the other way around.
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type PlayerType = 'human' | 'bot';

/**
 * Lifecycle of a single token (фишка):
 * - base:     still in the home yard, needs a 6 to come out
 * - active:   somewhere on the shared 52-cell main path
 * - homePath: on the player's private colored home stretch
 * - finished: reached the center / home — out of play
 */
export type TokenStatus = 'base' | 'active' | 'homePath' | 'finished';

/**
 * Whose turn it is right now and what the player is allowed to do.
 * - rolling:   waiting for the dice to be rolled
 * - moving:    dice rolled, waiting for the player to pick a movable token
 * - finished:  the game is over (see GameState.rankings)
 */
export type TurnStatus = 'rolling' | 'moving' | 'finished';

export interface Player {
  color: PlayerColor;
  type: PlayerType;
  name: string;
}

export interface Token {
  /** Stable unique id, e.g. `red-0`. */
  id: string;
  color: PlayerColor;
  /** 0..3 — which of the player's four tokens this is. */
  index: number;
  status: TokenStatus;
  /**
   * Relative progress along the player's own route, 0..56.
   *  -1            => in base (status === 'base')
   *  0..50         => main path  (status === 'active')
   *  51..56        => home path  (status === 'homePath')
   *  56            => finished   (status === 'finished')
   */
  progress: number;
}

/** A board coordinate on the 15x15 grid. */
export interface Coord {
  row: number;
  col: number;
}

export type BoardCellType =
  | 'empty'
  | 'path'
  | 'safe'
  | 'start'
  | 'base'
  | 'home'
  | 'center';

/** Declarative description of a single cell of the 15x15 board. */
export interface BoardCell {
  row: number;
  col: number;
  type: BoardCellType;
  /** Owning colour for base / start / home / center decoration cells. */
  color?: PlayerColor;
}

export interface PlayerConfig {
  color: PlayerColor;
  type: PlayerType;
  name?: string;
}

/** One capture event: `by` sent `victim` back to base. */
export interface CaptureEvent {
  by: PlayerColor;
  victim: PlayerColor;
}

export interface GameState {
  players: Player[];
  tokens: Token[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  selectedTokenId: string | null;
  movableTokenIds: string[];
  turnStatus: TurnStatus;
  /**
   * Finishing order: index 0 took 1st place, 1 took 2nd, etc. The game keeps
   * going until only one player is left unfinished; that last player is appended
   * as the final place when the game ends (turnStatus === 'finished').
   */
  rankings: PlayerColor[];
  /** Total number of token moves made this game. */
  moveCount: number;
  /** Every capture that happened, for the end-of-game summary. */
  captures: CaptureEvent[];
  /**
   * Just-captured tokens whose trip back to base is deferred until the moving
   * token visually arrives. Reconciled (sent to base) before any next action.
   */
  pendingCaptureIds: string[];
}
