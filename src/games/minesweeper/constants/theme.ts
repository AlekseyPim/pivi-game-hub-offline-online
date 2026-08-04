import {
  BOARD_BG_DARK,
  BOARD_BG_LIGHT,
  BOARD_GRID_DARK,
  BOARD_GRID_LIGHT,
  HIDDEN_DARK,
  HIDDEN_LIGHT,
  REVEALED_DARK,
  REVEALED_LIGHT,
} from '@/games/minesweeper/constants/colors';
import { getTheme as getBaseTheme, type BaseTheme } from '@/shared/constants/theme';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * Minesweeper's theme: the hub's chrome (background, text, cards) with the board
 * tokens laid on top. These are the *default* board colours — the palette picked
 * in settings (`store/prefsStore`) overrides grid/hidden/revealed while playing.
 */
export interface Theme extends BaseTheme {
  boardBg: string;
  /** Colour of the gaps between tiles (the visible cell grid). */
  boardGrid: string;
  hidden: string;
  revealed: string;
}

const LIGHT: Theme = {
  ...getBaseTheme(false),
  boardBg: BOARD_BG_LIGHT,
  boardGrid: BOARD_GRID_LIGHT,
  hidden: HIDDEN_LIGHT,
  revealed: REVEALED_LIGHT,
};

const DARK: Theme = {
  ...getBaseTheme(true),
  boardBg: BOARD_BG_DARK,
  boardGrid: BOARD_GRID_DARK,
  hidden: HIDDEN_DARK,
  revealed: REVEALED_DARK,
};

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? DARK : LIGHT;
}

export function useTheme(): Theme {
  return getTheme(useSettingsStore((s) => s.darkMode));
}
