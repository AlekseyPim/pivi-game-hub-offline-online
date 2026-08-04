/**
 * Minesweeper's own colour tokens — the board and everything drawn on it.
 * Screen background, cards and text come from the hub
 * (`shared/constants/colors`), so they are deliberately absent here.
 */

/** Accent used for primary buttons / active states across the app. */
export const ACCENT = '#1E88E5';

/** Board surface. */
export const BOARD_BG_LIGHT = '#ECEFF1';
export const BOARD_BG_DARK = '#455A64';

/**
 * Grid colour shown in the gaps between tiles. Picked to contrast with BOTH the
 * hidden and revealed tile fills so the cell borders read clearly in either
 * theme (the near-white light tiles used to blend into the board surface).
 */
export const BOARD_GRID_LIGHT = '#78909C';
export const BOARD_GRID_DARK = '#8DA1AD';

/** A hidden (un-revealed) cell. */
export const HIDDEN_LIGHT = '#B0BEC5';
export const HIDDEN_DARK = '#607D8B';
/** A revealed empty/number cell (kept distinct from the hidden tile colour). */
export const REVEALED_LIGHT = '#CFD8DC';
export const REVEALED_DARK = '#37474F';

/**
 * Selectable board colour palettes (grid line + hidden + revealed tiles). The
 * same palette is used in both light and dark app themes — only the board
 * surface changes, chosen in Settings. `grid` fills the gaps between tiles.
 */
export interface BoardPalette {
  key: string;
  /** Swatch shown in the settings picker (the hidden-tile colour). */
  swatch: string;
  grid: string;
  hidden: string;
  revealed: string;
}

export const BOARD_PALETTES: BoardPalette[] = [
  { key: 'classic', swatch: '#B0BEC5', grid: '#78909C', hidden: '#B0BEC5', revealed: '#ECEFF1' },
  { key: 'slate', swatch: '#607D8B', grid: '#37474F', hidden: '#607D8B', revealed: '#B0BEC5' },
  { key: 'forest', swatch: '#81C784', grid: '#4CAF50', hidden: '#A5D6A7', revealed: '#E8F5E9' },
  { key: 'sand', swatch: '#BCAAA4', grid: '#8D6E63', hidden: '#D7CCC8', revealed: '#EFEBE9' },
  { key: 'grape', swatch: '#B39DDB', grid: '#7E57C2', hidden: '#C5B4E3', revealed: '#EDE7F6' },
  { key: 'ocean', swatch: '#4FC3F7', grid: '#0288D1', hidden: '#81D4FA', revealed: '#E1F5FE' },
];

export const DEFAULT_BOARD_PALETTE = 'classic';

export function boardPalette(key: string): BoardPalette {
  return BOARD_PALETTES.find((p) => p.key === key) ?? BOARD_PALETTES[0];
}

/** Classic minesweeper number colours (index 1..8). */
export const NUMBER_COLORS: Record<number, string> = {
  1: '#1E88E5',
  2: '#43A047',
  3: '#E53935',
  4: '#5E35B1',
  5: '#B71C1C',
  6: '#00838F',
  7: '#6D4C41',
  8: '#546E7A',
};

/**
 * Per-player ownership colours (index 0..3). Only 2 are used today; the extra
 * two keep a future 4-player mode a one-line change.
 */
export const PLAYER_COLORS = ['#1E88E5', '#E53935', '#43A047', '#FDD835'] as const;
export const PLAYER_COLORS_DARK = ['#0D47A1', '#B71C1C', '#1B5E20', '#F9A825'] as const;

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
