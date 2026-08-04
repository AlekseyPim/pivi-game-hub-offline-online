/**
 * Battleship's own colour tokens — the board and everything drawn on it.
 * Screen background, cards and text come from the hub
 * (`shared/constants/colors`), so they are deliberately absent here.
 */

/** Accent used for primary buttons / active states across the app. */
export const ACCENT = '#1E88E5';

/** Board surround (the frame the sea sits in). */
export const BOARD_BG_LIGHT = '#ECEFF1';
export const BOARD_BG_DARK = '#263238';

/**
 * Selectable sea palettes: the water fill, the grid lines drawn over it and the
 * hull colour of your own ships. The same palette is used in both light and
 * dark app themes — only the surrounding chrome changes.
 */
export interface BoardPalette {
  key: string;
  /** Swatch shown in the settings picker (the water colour). */
  swatch: string;
  water: string;
  grid: string;
  ship: string;
  /** Hull colour for a ship that has taken damage but is still afloat. */
  shipDamaged: string;
}

export const BOARD_PALETTES: BoardPalette[] = [
  { key: 'ocean', swatch: '#B3E5FC', water: '#B3E5FC', grid: '#4FC3F7', ship: '#455A64', shipDamaged: '#78909C' },
  { key: 'navy', swatch: '#5C7C99', water: '#5C7C99', grid: '#33556F', ship: '#22303C', shipDamaged: '#3E5062' },
  { key: 'storm', swatch: '#B0BEC5', water: '#B0BEC5', grid: '#78909C', ship: '#37474F', shipDamaged: '#607D8B' },
  { key: 'tropic', swatch: '#80CBC4', water: '#80CBC4', grid: '#26A69A', ship: '#00695C', shipDamaged: '#26A69A' },
  { key: 'sand', swatch: '#E6D3B3', water: '#E6D3B3', grid: '#BCAAA4', ship: '#6D4C41', shipDamaged: '#A1887F' },
  { key: 'mono', swatch: '#E0E0E0', water: '#E0E0E0', grid: '#9E9E9E', ship: '#424242', shipDamaged: '#757575' },
];

export const DEFAULT_BOARD_PALETTE = 'ocean';

export function boardPalette(key: string): BoardPalette {
  return BOARD_PALETTES.find((p) => p.key === key) ?? BOARD_PALETTES[0];
}

/**
 * Shot markers. The miss splash is one fixed dark tone rather than a themed one:
 * it sits on the WATER, whose colour comes from the palette and is the same in
 * the light and dark app themes, so a light marker would vanish on every sea.
 * `HIT_STALE_OPACITY` is the brief's dimmed "it sailed away" hit.
 */
export const MISS_COLOR = '#12262E';
export const HIT_COLOR = '#E53935';
export const SUNK_COLOR = '#B71C1C';
export const HIT_STALE_OPACITY = 0.4;

/** Highlight ring drawn on the last cell that was fired at. */
export const LAST_SHOT_COLOR = '#FFC107';

/** Per-player colours (slot 0 / slot 1) used in the lobby and results. */
export const PLAYER_COLORS = ['#1E88E5', '#E53935'] as const;

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
