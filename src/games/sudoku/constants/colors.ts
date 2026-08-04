/**
 * Sudoku's own colour tokens — the grid and everything printed on it. Screen
 * background, cards and text come from the hub (`shared/constants/colors`), so
 * they are deliberately absent here.
 */

/** Accent used for primary buttons / active states inside sudoku. */
export const ACCENT = '#1E88E5';

/** The paper the grid is printed on. */
export const GRID_BG_LIGHT = '#FFFFFF';
export const GRID_BG_DARK = '#1E1E1E';

/** Thin lines between cells, thick ones between 3×3 boxes. */
export const GRID_LINE_LIGHT = '#C7CDD2';
export const GRID_LINE_DARK = '#4A5157';
export const BOX_LINE_LIGHT = '#37474F';
export const BOX_LINE_DARK = '#B0BEC5';

/** A printed digit versus one the player wrote. */
export const GIVEN_LIGHT = '#212121';
export const GIVEN_DARK = '#FFFFFF';
export const ENTERED_LIGHT = '#1565C0';
export const ENTERED_DARK = '#64B5F6';

/** Selection, and the softer wash over its row, column and box. */
export const SELECTED_LIGHT = '#BBDEFB';
export const SELECTED_DARK = '#1B3A57';
export const PEER_LIGHT = '#ECEFF1';
export const PEER_DARK = '#2A2F33';
/** Same digit as the selected cell, wherever it appears. */
export const SAME_DIGIT_LIGHT = '#D7E9FB';
export const SAME_DIGIT_DARK = '#243B4D';

/** Two filled cells that cannot both be right. */
export const CONFLICT = '#E53935';

/**
 * Territory tints for online play — a whisper of colour behind each player's
 * half, enough to read the split at a glance without fighting the digits.
 */
export const TERRITORY = ['rgba(30,136,229,0.13)', 'rgba(229,57,53,0.13)'] as const;

/** Per-player colours (slot 0 / slot 1) used in the lobby and results. */
export const PLAYER_COLORS = ['#1E88E5', '#E53935'] as const;

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
