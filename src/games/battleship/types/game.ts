/**
 * Core domain types for Battleship (морской бой).
 *
 * Framework-agnostic: no React, no Zustand, no Reanimated. The store, rules and
 * UI all depend on these types — never the other way around.
 */

/**
 * Game mode:
 *  - `classic` — the traditional game: place the fleet, then shoot.
 *  - `moving`  — every turn a ship may first sail one cell along its axis or
 *                turn 90°, and only then does the player shoot.
 */
export type GameMode = 'classic' | 'moving';

/** A ship lies either horizontally (bow → east) or vertically (bow → south). */
export type Orientation = 'h' | 'v';

/**
 * What the OWNER of a board knows about a cell that has been shot at.
 *
 * `hitStale` only ever appears in `moving` mode: the cell was hit once, but the
 * damaged ship has since sailed away, so the marker stays on the board at 0.4
 * opacity (per the game brief) instead of disappearing.
 */
export type CellMark = 'none' | 'miss' | 'hit' | 'hitStale' | 'sunk';

export type Phase = 'placement' | 'playing' | 'finished';

/** How a single shot resolved. */
export type ShotOutcome = 'miss' | 'hit' | 'sunk';

export interface Ship {
  id: string;
  /** Number of decks (1..4). */
  size: number;
  /** Bow row (0-based). Cells run east for `h`, south for `v`. */
  row: number;
  /** Bow column (0-based). */
  col: number;
  orientation: Orientation;
  /**
   * Damage per deck, index 0 = bow. Damage travels WITH the ship when it moves,
   * unlike the board markers, which stay on their cells.
   */
  hits: boolean[];
  sunk: boolean;
}

/**
 * One player's sea. `ships` is authoritative only when {@link known} is true —
 * for an online opponent we hold a fogged view where `ships` contains just the
 * wrecks that have already been revealed by sinking them.
 */
export interface Board {
  /** Ships standing on this board (fogged view: only sunk ones). */
  ships: Ship[];
  /** `size * size` markers of every shot fired AT this board. */
  marks: CellMark[];
  /** Ships still afloat. Accurate even in a fogged view. */
  shipsLeft: number;
  /** False when `ships` is a fogged, partial view (online opponent). */
  known: boolean;
}

export interface Player {
  name: string;
  bot: boolean;
}

export interface PlayerConfig {
  name: string;
  bot: boolean;
}

/** The report a board's owner produces for one incoming shot. */
export interface ShotReport {
  index: number;
  outcome: ShotOutcome;
  /**
   * Movement mode only: the shot landed on a deck that was already holed, so it
   * did no fresh damage and earns no extra turn.
   */
  repeat?: boolean;
  /** Present when the shot sank a ship — the wreck is revealed to the shooter. */
  sunk?: {
    ship: Ship;
    /** Cells around the wreck, auto-marked as misses. */
    around: number[];
  };
  /** True when this shot sank the last ship of the fleet. */
  allSunk: boolean;
}

/** End-of-game per-player summary. */
export interface PlayerResult {
  index: number;
  name: string;
  shots: number;
  hits: number;
  /** Enemy ships this player sank. */
  sunk: number;
}

export interface GameState {
  phase: Phase;
  mode: GameMode;
  /** Board edge length (always {@link BOARD_SIZE} today). */
  size: number;
  /** True for a networked match — the enemy board is then a fogged view. */
  online: boolean;
  /** Exactly two boards, indexed by player slot. */
  boards: Board[];
  players: Player[];
  /** Slot whose turn it is to act. */
  turn: number;
  /** The slot this device plays (local games: always 0). */
  mySlot: number;
  /** Per slot: the fleet is placed and confirmed. */
  ready: boolean[];
  winner: number | null;
  /** `moving` mode: the current player has already moved a ship this turn. */
  moveUsed: boolean;
  /** Shots fired, per slot. */
  shots: number[];
  /** Shots that hit, per slot. */
  hits: number[];
  /** Enemy ships sunk, per slot. */
  sunkCount: number[];
  /** Last cell shot at each board, for the impact highlight. */
  lastShot: (number | null)[];
}
