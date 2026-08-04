/**
 * Core domain types for Sudoku.
 *
 * Framework-agnostic: no React, no Zustand. The store, rules and UI all depend
 * on these types — never the other way around.
 */

/** Three difficulties, differing only in how many digits are given away. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export type Phase = 'playing' | 'finished';

export interface Cell {
  index: number;
  /** 0 when empty. */
  value: number;
  /** Part of the printed puzzle: immutable, and never owned by anybody. */
  given: boolean;
  /** Pencil marks, ascending. Cleared as soon as a value is written. */
  notes: number[];
  /**
   * Which player may write here. Single player: always 0. Online: the board is
   * carved into two territories — see `logic/territories`.
   */
  owner: number;
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
  /** Correctly filled cells of their own territory. */
  filled: number;
  /** Cells of their territory that started empty. */
  total: number;
  /** Digits written that contradict the solution. */
  mistakes: number;
}

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  /** Networked match — the board is shared and split into territories. */
  online: boolean;
  /** 81 cells, row-major. */
  cells: Cell[];
  /**
   * The unique solution, 81 digits.
   *
   * Kept in state because completion has to be judged against something, but it
   * is NEVER surfaced: there are no hints in this game, and no UI reads it.
   */
  solution: number[];
  players: Player[];
  /** The slot this device plays. Single player: 0. */
  mySlot: number;
  winner: number | null;
  /** Wrong digits written, per player. Shown only in the results. */
  mistakes: number[];
  /** Epoch ms, for the clock on the board and the results. */
  startedAt: number;
  finishedAt: number | null;
}
