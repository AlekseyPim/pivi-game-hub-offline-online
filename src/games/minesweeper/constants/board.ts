import type { BoardSize, Difficulty } from '@/games/minesweeper/types/game';

/** The two supported board sizes and their classic mine counts. */
export const BOARD_SIZES: BoardSize[] = [9, 16];

export const MINES_BY_SIZE: Record<BoardSize, number> = {
  9: 10,
  16: 40,
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal'];

/**
 * Mine-count multiplier. The classic counts above are the 1.0 baseline; the
 * player can crank it up to 1.5 (50% more mines) via the setup slider.
 */
export const MIN_MINE_DENSITY = 1;
export const MAX_MINE_DENSITY = 1.5;
export const MINE_DENSITY_STEP = 0.1;

/** Clamp + snap an arbitrary density to the allowed [1.0, 1.5] / 0.1 grid. */
export function clampMineDensity(density: number): number {
  const steps = Math.round((density - MIN_MINE_DENSITY) / MINE_DENSITY_STEP);
  const snapped = MIN_MINE_DENSITY + steps * MINE_DENSITY_STEP;
  const bounded = Math.min(MAX_MINE_DENSITY, Math.max(MIN_MINE_DENSITY, snapped));
  return Math.round(bounded * 100) / 100;
}

/** Free lives granted at game start, per difficulty. */
export const LIVES_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  normal: 0,
};

/** Online multiplayer bounds. Two today; bump MAX to open up to four seats. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2; // architecture supports up to 4 — raise to enable

/**
 * Mine count for a board, scaled by the density multiplier (default 1.0). Always
 * leaves at least one safe cell so the board is playable at any density.
 */
export function minesForSize(size: number, density = MIN_MINE_DENSITY): number {
  const base = MINES_BY_SIZE[size as BoardSize] ?? Math.round(size * size * 0.15);
  const scaled = Math.round(base * clampMineDensity(density));
  return Math.min(scaled, size * size - 1);
}
