import type { PlayerColor } from '@/games/ludo/types/game';

/** Vivid fill colours used for tokens, bases and home stretches. */
export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#E53935',
  green: '#43A047',
  yellow: '#FDD835',
  blue: '#1E88E5',
};

/** Softer tint used to paint the base yards and home stretches. */
export const COLOR_TINT: Record<PlayerColor, string> = {
  red: '#FFCDD2',
  green: '#C8E6C9',
  yellow: '#FFF9C4',
  blue: '#BBDEFB',
};

/** Darker shade used for borders / contrast (yellow needs a readable text colour). */
export const COLOR_DARK: Record<PlayerColor, string> = {
  red: '#B71C1C',
  green: '#1B5E20',
  yellow: '#F9A825',
  blue: '#0D47A1',
};

/** Readable foreground colour to place on top of a token of each colour. */
export const COLOR_CONTRAST: Record<PlayerColor, string> = {
  red: '#FFFFFF',
  green: '#FFFFFF',
  yellow: '#3E2723',
  blue: '#FFFFFF',
};

export const BOARD_BACKGROUND = '#FFFFFF';
/** Border of the cells and the board — black at 70% opacity. */
export const GRID_LINE = 'rgba(0, 0, 0, 0.7)';
export const PATH_FILL = '#FAFAFA';
export const SAFE_FILL = '#ECEFF1';
