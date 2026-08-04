import {
  BOX_LINE_DARK,
  BOX_LINE_LIGHT,
  ENTERED_DARK,
  ENTERED_LIGHT,
  GIVEN_DARK,
  GIVEN_LIGHT,
  GRID_BG_DARK,
  GRID_BG_LIGHT,
  GRID_LINE_DARK,
  GRID_LINE_LIGHT,
  PEER_DARK,
  PEER_LIGHT,
  SAME_DIGIT_DARK,
  SAME_DIGIT_LIGHT,
  SELECTED_DARK,
  SELECTED_LIGHT,
} from '@/games/sudoku/constants/colors';
import { getTheme as getBaseTheme, type BaseTheme } from '@/shared/constants/theme';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * Sudoku's theme: the hub's chrome (background, text, cards) with the grid
 * tokens laid on top. Building on {@link BaseTheme} rather than redefining it is
 * what keeps a sudoku screen and the hub around it the same colour.
 */
export interface Theme extends BaseTheme {
  gridBg: string;
  gridLine: string;
  boxLine: string;
  given: string;
  entered: string;
  selected: string;
  peer: string;
  sameDigit: string;
}

const LIGHT: Theme = {
  ...getBaseTheme(false),
  gridBg: GRID_BG_LIGHT,
  gridLine: GRID_LINE_LIGHT,
  boxLine: BOX_LINE_LIGHT,
  given: GIVEN_LIGHT,
  entered: ENTERED_LIGHT,
  selected: SELECTED_LIGHT,
  peer: PEER_LIGHT,
  sameDigit: SAME_DIGIT_LIGHT,
};

const DARK: Theme = {
  ...getBaseTheme(true),
  gridBg: GRID_BG_DARK,
  gridLine: GRID_LINE_DARK,
  boxLine: BOX_LINE_DARK,
  given: GIVEN_DARK,
  entered: ENTERED_DARK,
  selected: SELECTED_DARK,
  peer: PEER_DARK,
  sameDigit: SAME_DIGIT_DARK,
};

export function getTheme(darkMode: boolean): Theme {
  return darkMode ? DARK : LIGHT;
}

export function useTheme(): Theme {
  return getTheme(useSettingsStore((s) => s.darkMode));
}
