import {
  CORRIDOR_MAX,
  CORRIDOR_MIN,
  GRID_SIZE,
} from '@/games/ludo/constants/board';

/**
 * Non-uniform board geometry. The 15x15 grid keeps the same logical cells, but
 * the 12 base rows/cols are drawn narrower than the 3 corridor rows/cols. This
 * makes the corner base zones compact and the central cross (plus the home
 * stretches and the cells walked near the middle) larger — at the cost of the
 * arm cells becoming rectangles.
 *
 * All pixel maths for rendering goes through here so the components stay dumb.
 */

export interface BoardLayout {
  /** Total board size in pixels (square). */
  size: number;
  /** Cumulative left/top edge of each line, length GRID_SIZE + 1. */
  edges: number[];
  /** Width/height of each row/col, length GRID_SIZE. Symmetric across axes. */
  sizes: number[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CORRIDOR_COUNT = CORRIDOR_MAX - CORRIDOR_MIN + 1;
const BASE_COUNT = GRID_SIZE - CORRIDOR_COUNT;

function isCorridor(index: number): boolean {
  return index >= CORRIDOR_MIN && index <= CORRIDOR_MAX;
}

function clampIndex(index: number): number {
  return Math.max(0, Math.min(GRID_SIZE - 1, index));
}

export function buildLayout(size: number, baseRatio: number): BoardLayout {
  const corridor = size / (BASE_COUNT * baseRatio + CORRIDOR_COUNT);
  const base = corridor * baseRatio;

  const sizes: number[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    sizes.push(isCorridor(i) ? corridor : base);
  }

  const edges: number[] = [0];
  for (let i = 0; i < GRID_SIZE; i++) {
    edges.push(edges[i] + sizes[i]);
  }

  return { size: edges[GRID_SIZE], edges, sizes };
}

/** Pixel position along an axis for a (possibly fractional) grid coordinate. */
export function axisPos(layout: BoardLayout, value: number): number {
  const index = Math.floor(value);
  const frac = value - index;
  const ci = clampIndex(index);
  return layout.edges[ci] + frac * layout.sizes[ci];
}

/** The rectangle of a whole logical cell. */
export function cellRect(layout: BoardLayout, row: number, col: number): Rect {
  return {
    x: layout.edges[col],
    y: layout.edges[row],
    w: layout.sizes[col],
    h: layout.sizes[row],
  };
}

/** Center pixel of a (possibly fractional) grid coordinate. */
export function centerOf(
  layout: BoardLayout,
  row: number,
  col: number,
): { x: number; y: number } {
  return { x: axisPos(layout, col + 0.5), y: axisPos(layout, row + 0.5) };
}

/** Fitting (smaller) extent of the cell under a (possibly fractional) coord. */
export function extentAt(layout: BoardLayout, row: number, col: number): number {
  return Math.min(
    layout.sizes[clampIndex(Math.floor(row))],
    layout.sizes[clampIndex(Math.floor(col))],
  );
}
