import type { Coord, PlayerColor } from '@/games/ludo/types/game';

/** The board is a classic 15x15 grid. */
export const GRID_SIZE = 15;

/** The three middle rows/cols (the cross corridor) are drawn wider than the base rows/cols. */
export const CORRIDOR_MIN = 6;
export const CORRIDOR_MAX = 8;

/**
 * Size of a base/corner cell relative to a wide corridor cell. Below 1 the base
 * corners shrink and the central cross (plus home stretches) grows, turning the
 * arm cells into rectangles. This single knob controls the whole rebalance:
 * lower = smaller bases / bigger field. Higher = smaller center, bigger base
 * and arm cells. 0.6 keeps a moderate rebalance without a giant middle.
 */
export const BASE_CELL_RATIO = 0.6;

/** Every player has exactly four tokens. */
export const TOKENS_PER_PLAYER = 4;

/**
 * Relative progress milestones (see Token.progress in types/game.ts):
 *  - 0..50  : the 51 cells of the shared main path the token walks on
 *  - 51..56 : the 6 cells of the private home stretch
 *  - 56     : the finish (center)
 */
export const LAST_MAIN_PROGRESS = 50;
export const FIRST_HOME_PROGRESS = 51;
export const FINISH_PROGRESS = 56;

/**
 * The 52 cells of the shared main path, in clockwise order, as [row, col].
 *
 * Index 0 is red's start square. The four start squares sit 13 apart, so the
 * whole layout is just red's quadrant rotated 90° three times around the
 * center (7,7). Verified to close back onto index 0.
 */
export const MAIN_PATH: Coord[] = [
  // Red quadrant (0-12)
  { row: 6, col: 1 },
  { row: 6, col: 2 },
  { row: 6, col: 3 },
  { row: 6, col: 4 },
  { row: 6, col: 5 },
  { row: 5, col: 6 },
  { row: 4, col: 6 },
  { row: 3, col: 6 },
  { row: 2, col: 6 },
  { row: 1, col: 6 },
  { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 },
  // Green quadrant (13-25)
  { row: 1, col: 8 },
  { row: 2, col: 8 },
  { row: 3, col: 8 },
  { row: 4, col: 8 },
  { row: 5, col: 8 },
  { row: 6, col: 9 },
  { row: 6, col: 10 },
  { row: 6, col: 11 },
  { row: 6, col: 12 },
  { row: 6, col: 13 },
  { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 },
  // Yellow quadrant (26-38)
  { row: 8, col: 13 },
  { row: 8, col: 12 },
  { row: 8, col: 11 },
  { row: 8, col: 10 },
  { row: 8, col: 9 },
  { row: 9, col: 8 },
  { row: 10, col: 8 },
  { row: 11, col: 8 },
  { row: 12, col: 8 },
  { row: 13, col: 8 },
  { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 },
  // Blue quadrant (39-51)
  { row: 13, col: 6 },
  { row: 12, col: 6 },
  { row: 11, col: 6 },
  { row: 10, col: 6 },
  { row: 9, col: 6 },
  { row: 8, col: 5 },
  { row: 8, col: 4 },
  { row: 8, col: 3 },
  { row: 8, col: 2 },
  { row: 8, col: 1 },
  { row: 8, col: 0 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
];

/** Index into MAIN_PATH where each colour's token enters the board. */
export const START_INDEX_BY_COLOR: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * The 6-cell private home stretch for each colour, from the board edge inwards.
 * The last entry (index 5) is the finishing square next to the center.
 */
export const HOME_PATH_BY_COLOR: Record<PlayerColor, Coord[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
    { row: 7, col: 6 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
    { row: 6, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
    { row: 7, col: 8 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
    { row: 8, col: 7 },
  ],
};

/**
 * Indices on MAIN_PATH that are "safe": tokens here can never be captured.
 * These are the four colored start squares plus the four star squares.
 */
export const SAFE_INDICES: ReadonlySet<number> = new Set([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

/**
 * Four base (yard) slots per colour where idle tokens rest. They sit in a tight
 * 2x2 cluster near the middle of each 6x6 corner so the yard stays compact and
 * the bigger tokens still fit without overlapping.
 */
export const BASE_SLOTS_BY_COLOR: Record<PlayerColor, Coord[]> = {
  red: [
    { row: 1.7, col: 1.7 },
    { row: 1.7, col: 3.3 },
    { row: 3.3, col: 1.7 },
    { row: 3.3, col: 3.3 },
  ],
  green: [
    { row: 1.7, col: 10.7 },
    { row: 1.7, col: 12.3 },
    { row: 3.3, col: 10.7 },
    { row: 3.3, col: 12.3 },
  ],
  yellow: [
    { row: 10.7, col: 10.7 },
    { row: 10.7, col: 12.3 },
    { row: 12.3, col: 10.7 },
    { row: 12.3, col: 12.3 },
  ],
  blue: [
    { row: 10.7, col: 1.7 },
    { row: 10.7, col: 3.3 },
    { row: 12.3, col: 1.7 },
    { row: 12.3, col: 3.3 },
  ],
};

/** Top-left corner of each colour's 6x6 base yard, for painting the board. */
export const BASE_ORIGIN_BY_COLOR: Record<PlayerColor, Coord> = {
  red: { row: 0, col: 0 },
  green: { row: 0, col: 9 },
  yellow: { row: 9, col: 9 },
  blue: { row: 9, col: 0 },
};

/** Display order of colours around the board (clockwise from top-left). */
export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/** Human-readable colour names, used as default player names and picker labels. */
export const COLOR_LABEL: Record<PlayerColor, string> = {
  red: 'Красный',
  green: 'Зелёный',
  yellow: 'Жёлтый',
  blue: 'Синий',
};

/** Coloured-circle emoji shown in the centre of ordinary tokens (per colour). */
export const COLOR_EMOJI: Record<PlayerColor, string> = {
  red: '🔴',
  green: '🟢',
  yellow: '🟡',
  blue: '🔵',
};
