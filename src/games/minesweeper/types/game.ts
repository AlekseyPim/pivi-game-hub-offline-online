/**
 * Core domain types for the Minesweeper game.
 *
 * Framework-agnostic: no React, no Zustand, no Reanimated. The store, rules and
 * UI all depend on these types — never the other way around.
 */

/** Board is a square of `size` × `size` cells. Two supported sizes. */
export type BoardSize = 9 | 16;

/**
 * Difficulty only governs the safety net:
 *  - easy:   one free life (surviving a single mine hit)
 *  - normal: no lives (the first mine ends the game)
 */
export type Difficulty = 'easy' | 'normal';

/** How multiplayer turns are taken (ignored in single-player). */
export type TurnMode = 'parallel' | 'sequential';

/** A hidden cell can carry a player annotation. */
export type CellMark = 'none' | 'flag' | 'question';

export type CellState = 'hidden' | 'revealed';

export type Phase = 'playing' | 'won' | 'lost';

/**
 * One board cell. `owner` is the player index (0-based) allowed to interact with
 * it; in single-player every cell is owned by player 0. The board is split into
 * (near-)equal random ownership shares between the players.
 */
export interface Cell {
  index: number;
  row: number;
  col: number;
  mine: boolean;
  /** Count of neighbouring mines, 0..8 (meaningless when `mine`). */
  adjacent: number;
  state: CellState;
  mark: CellMark;
  owner: number;
  /** The mine that was actually stepped on (for the losing highlight). */
  exploded?: boolean;
}

export interface PlayerConfig {
  name: string;
}

export interface Player {
  name: string;
}

/** End-of-game per-player summary. */
export interface PlayerResult {
  index: number;
  name: string;
  moves: number;
  correctFlags: number;
}

export interface GameState {
  size: number;
  mines: number;
  difficulty: Difficulty;
  turnMode: TurnMode;
  cells: Cell[];
  players: Player[];
  phase: Phase;
  /** Remaining free lives (easy = 1, normal = 0). Shared across players. */
  livesLeft: number;
  currentPlayerIndex: number;
  /** Reveals performed by each player (their "move" count). */
  moveCounts: number[];
  /** Whether each player has made their first reveal (first-click is safe). */
  firstMoveDone: boolean[];
  /** Count of non-mine cells revealed so far (win when it reaches the target). */
  revealedSafe: number;
  /** Total non-mine cells — the win target. */
  safeTarget: number;
}
