import {
  BASE_ORIGIN_BY_COLOR,
  BASE_SLOTS_BY_COLOR,
  COLOR_ORDER,
  FINISH_PROGRESS,
  FIRST_HOME_PROGRESS,
  GRID_SIZE,
  HOME_PATH_BY_COLOR,
  LAST_MAIN_PROGRESS,
  MAIN_PATH,
  SAFE_INDICES,
  START_INDEX_BY_COLOR,
} from '@/games/ludo/constants/board';
import type {
  BoardCell,
  Coord,
  PlayerColor,
  Token,
} from '@/games/ludo/types/game';

/**
 * Pure geometry helpers. Everything about *where things are* on the 15x15 grid
 * lives here so the Board component only has to draw.
 */

/** Convert a token's relative progress to an absolute MAIN_PATH index. */
export function mainIndexForProgress(color: PlayerColor, progress: number): number {
  const start = START_INDEX_BY_COLOR[color];
  return (start + progress) % MAIN_PATH.length;
}

/** Grid coordinate of a token sitting in its base, by token index (0..3). */
export function baseCoord(color: PlayerColor, tokenIndex: number): Coord {
  return BASE_SLOTS_BY_COLOR[color][tokenIndex];
}

/**
 * Grid coordinate for any token, whatever its status.
 * Base tokens map to their yard slot; everything else maps onto the path.
 */
export function coordForToken(token: Token): Coord {
  if (token.status === 'base') {
    return baseCoord(token.color, token.index);
  }
  return coordForProgress(token.color, token.progress);
}

/** Grid coordinate for a given colour at a given progress (0..56). */
export function coordForProgress(color: PlayerColor, progress: number): Coord {
  if (progress <= LAST_MAIN_PROGRESS) {
    return MAIN_PATH[mainIndexForProgress(color, progress)];
  }
  const homeIndex = progress - FIRST_HOME_PROGRESS;
  return HOME_PATH_BY_COLOR[color][homeIndex];
}

/**
 * The ordered list of grid coordinates a token visits when moving from one
 * progress value to another. Used to animate the hopping motion.
 */
export function waypointsBetween(
  color: PlayerColor,
  fromProgress: number,
  toProgress: number,
): Coord[] {
  const points: Coord[] = [];
  const from = Math.max(fromProgress, 0);
  for (let p = from + 1; p <= toProgress; p++) {
    points.push(coordForProgress(color, p));
  }
  return points;
}

/**
 * The ordered cells a token would highlight as its move preview for a dice
 * value: every cell it will pass through, ending on its destination. A token
 * leaving base only ever previews its single start square.
 */
export function movePreviewCells(token: Token, dice: number): Coord[] {
  if (token.status === 'base') {
    return [coordForProgress(token.color, 0)];
  }
  return waypointsBetween(token.color, token.progress, token.progress + dice);
}

/** Is this MAIN_PATH index a safe (non-capturable) square? */
export function isSafeIndex(index: number): boolean {
  return SAFE_INDICES.has(index);
}

function inBaseQuadrant(row: number, col: number, color: PlayerColor): boolean {
  const origin = BASE_ORIGIN_BY_COLOR[color];
  return (
    row >= origin.row &&
    row < origin.row + 6 &&
    col >= origin.col &&
    col < origin.col + 6
  );
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Build the full declarative 15x15 board model. Pure and deterministic, so it
 * can be computed once and handed to the Board component for rendering.
 */
export function buildBoardCells(): BoardCell[] {
  const cells: BoardCell[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      cells.push(classifyCell(row, col));
    }
  }
  return cells;
}

function classifyCell(row: number, col: number): BoardCell {
  // Center 3x3 home triangle.
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
    return { row, col, type: 'center' };
  }

  // Base yards (6x6 corners).
  for (const color of COLOR_ORDER) {
    if (inBaseQuadrant(row, col, color)) {
      return { row, col, type: 'base', color };
    }
  }

  // Home stretches.
  for (const color of COLOR_ORDER) {
    const homeCells = HOME_PATH_BY_COLOR[color];
    if (homeCells.some((c) => sameCoord(c, { row, col }))) {
      return { row, col, type: 'home', color };
    }
  }

  // Main path: start squares, safe squares, or plain path.
  const mainIndex = MAIN_PATH.findIndex((c) => sameCoord(c, { row, col }));
  if (mainIndex >= 0) {
    const startColor = COLOR_ORDER.find(
      (color) => START_INDEX_BY_COLOR[color] === mainIndex,
    );
    if (startColor) {
      return { row, col, type: 'start', color: startColor };
    }
    if (isSafeIndex(mainIndex)) {
      return { row, col, type: 'safe' };
    }
    return { row, col, type: 'path' };
  }

  return { row, col, type: 'empty' };
}

export { FINISH_PROGRESS };
