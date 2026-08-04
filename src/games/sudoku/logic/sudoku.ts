import {
  BOX,
  CELLS,
  GIVENS_BY_DIFFICULTY,
  SIZE,
  colOf,
  rowOf,
} from '@/games/sudoku/constants/board';
import type { Difficulty } from '@/games/sudoku/types/game';

/**
 * Puzzle generation and solving, as pure functions over a flat `number[81]`
 * grid (0 = empty).
 *
 * Everything works on nine-bit candidate masks rather than arrays: bit `d - 1`
 * set means digit `d` is still allowed. That keeps the solver fast enough to be
 * run once per removal while carving a puzzle, which is what lets us guarantee
 * a unique solution instead of hoping for one.
 */

const FULL_MASK = 0b111111111;

/** Peers of every cell: the other 20 cells sharing its row, column or box. */
const PEERS: number[][] = buildPeers();

function buildPeers(): number[][] {
  const peers: number[][] = [];
  for (let i = 0; i < CELLS; i++) {
    const r = rowOf(i);
    const c = colOf(i);
    const boxTop = Math.floor(r / BOX) * BOX;
    const boxLeft = Math.floor(c / BOX) * BOX;
    const set = new Set<number>();
    for (let k = 0; k < SIZE; k++) {
      set.add(r * SIZE + k);
      set.add(k * SIZE + c);
    }
    for (let dr = 0; dr < BOX; dr++) {
      for (let dc = 0; dc < BOX; dc++) {
        set.add((boxTop + dr) * SIZE + boxLeft + dc);
      }
    }
    set.delete(i);
    peers.push([...set]);
  }
  return peers;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Digits still legal in `index`, as a bitmask. */
function candidates(grid: number[], index: number): number {
  let mask = FULL_MASK;
  for (const peer of PEERS[index]) {
    const v = grid[peer];
    if (v) mask &= ~(1 << (v - 1));
  }
  return mask;
}

/**
 * Count solutions, stopping at `limit`. Always expands the most constrained
 * cell first, which prunes hard grids enormously.
 */
function countSolutions(grid: number[], limit: number): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;

  for (let i = 0; i < CELLS; i++) {
    if (grid[i]) continue;
    const mask = candidates(grid, i);
    let count = 0;
    for (let d = 0; d < SIZE; d++) if (mask & (1 << d)) count++;
    // A blank cell with nowhere to go: this branch is already dead.
    if (count === 0) return 0;
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }
  }

  if (best === -1) return 1; // no blanks left — a complete solution

  let found = 0;
  for (let d = 0; d < SIZE; d++) {
    if (!(bestMask & (1 << d))) continue;
    grid[best] = d + 1;
    found += countSolutions(grid, limit - found);
    grid[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

/** Solve in place with randomised digit order. True when a solution was found. */
function fill(grid: number[]): boolean {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < CELLS; i++) {
    if (grid[i]) continue;
    const mask = candidates(grid, i);
    let count = 0;
    for (let d = 0; d < SIZE; d++) if (mask & (1 << d)) count++;
    if (count === 0) return false;
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }
  }
  if (best === -1) return true;

  const digits = shuffle(
    Array.from({ length: SIZE }, (_, d) => d + 1).filter(
      (d) => bestMask & (1 << (d - 1)),
    ),
  );
  for (const d of digits) {
    grid[best] = d;
    if (fill(grid)) return true;
    grid[best] = 0;
  }
  return false;
}

/** A complete, valid, randomly chosen grid. */
export function solvedGrid(): number[] {
  const grid = new Array<number>(CELLS).fill(0);
  fill(grid);
  return grid;
}

/** True when the grid has exactly one solution. */
export function hasUniqueSolution(grid: number[]): boolean {
  return countSolutions([...grid], 2) === 1;
}

export interface Puzzle {
  /** The starting grid, 0 where the player must write. */
  puzzle: number[];
  /** Its one and only solution. */
  solution: number[];
}

/**
 * Carve a puzzle of the requested difficulty out of a fresh solution.
 *
 * Cells are cleared in random order and a clearing is kept only while the
 * puzzle still has exactly one solution — so every puzzle is solvable by pure
 * deduction. If the target count of givens cannot be reached (it gets harder
 * the fewer remain), we stop at the best we managed rather than loop forever;
 * the puzzle is still valid, just a touch easier than asked.
 */
export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const solution = solvedGrid();
  const puzzle = [...solution];
  const target = GIVENS_BY_DIFFICULTY[difficulty];
  let givens = CELLS;

  for (const index of shuffle(Array.from({ length: CELLS }, (_, i) => i))) {
    if (givens <= target) break;
    const backup = puzzle[index];
    puzzle[index] = 0;
    if (hasUniqueSolution(puzzle)) {
      givens -= 1;
    } else {
      puzzle[index] = backup;
    }
  }

  return { puzzle, solution };
}

/**
 * Cells whose digit clashes with another filled cell in the same row, column or
 * box. Derived from what is on the board — never from the solution — so it
 * tells the player "these two cannot both be right", not which one is wrong.
 */
export function conflicts(values: number[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < CELLS; i++) {
    const v = values[i];
    if (!v) continue;
    for (const peer of PEERS[i]) {
      if (values[peer] === v) {
        bad.add(i);
        bad.add(peer);
      }
    }
  }
  return bad;
}
