import { BOARD_BG_DARK, BOARD_BG_LIGHT } from '@/games/battleship/constants/colors';
import { getTheme as getBaseTheme, type BaseTheme } from '@/shared/constants/theme';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * Battleship's theme: the hub's chrome (background, text, cards) with the board
 * surround laid on top. The sea itself is themed separately via the selectable
 * board palette (`store/prefsStore`).
 */
export interface Theme extends BaseTheme {
  boardBg: string;
}

const LIGHT: Theme = {
  ...getBaseTheme(false),
  boardBg: BOARD_BG_LIGHT,
};

const DARK: Theme = {
  ...getBaseTheme(true),
  boardBg: BOARD_BG_DARK,
};

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? DARK : LIGHT;
}

export function useTheme(): Theme {
  return getTheme(useSettingsStore((s) => s.darkMode));
}
