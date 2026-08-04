import type { Difficulty } from '@/games/sudoku/types/game';

/** A classic 9×9 grid of nine 3×3 boxes. */
export const SIZE = 9;
export const BOX = 3;
export const CELLS = SIZE * SIZE;

/** The digits a cell may hold. */
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * How many digits the puzzle starts with. Fewer givens means more deduction;
 * the generator always keeps the solution unique, so even `hard` is solvable
 * by logic alone and never needs guessing.
 */
export const GIVENS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 45,
  medium: 34,
  hard: 28,
};

/** Online multiplayer is strictly two players sharing one grid. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

/** The middle 3×3 box, the one that gets split between both players. */
export const CENTRE_BOX = 4;

export const rowOf = (index: number): number => Math.floor(index / SIZE);
export const colOf = (index: number): number => index % SIZE;
export const idx = (row: number, col: number): number => row * SIZE + col;

/** Which 3×3 box a cell belongs to, 0..8 in reading order. */
export const boxOf = (index: number): number =>
  Math.floor(rowOf(index) / BOX) * BOX + Math.floor(colOf(index) / BOX);

/** Every cell index of one 3×3 box. */
export function boxCells(box: number): number[] {
  const top = Math.floor(box / BOX) * BOX;
  const left = (box % BOX) * BOX;
  const out: number[] = [];
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) out.push(idx(top + r, left + c));
  }
  return out;
}

/** Human-readable cell name, e.g. `R4C7`. */
export function cellName(index: number): string {
  return `R${rowOf(index) + 1}C${colOf(index) + 1}`;
}
