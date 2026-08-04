import {
  CARD_DARK,
  CARD_LIGHT,
  SCREEN_BG_DARK,
  SCREEN_BG_LIGHT,
  TEXT_PRIMARY_DARK,
  TEXT_PRIMARY_LIGHT,
  TEXT_SECONDARY_DARK,
  TEXT_SECONDARY_LIGHT,
} from '@/shared/constants/colors';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * The chrome every screen in the hub shares, driven by the persisted `darkMode`
 * preference. A game builds its own theme on top of this one
 * (`games/<id>/constants/theme.ts`) by spreading it and adding board tokens, so
 * a game screen and the hub around it always agree on background and text.
 */
export interface BaseTheme {
  dark: boolean;
  background: string;
  textPrimary: string;
  textSecondary: string;
  card: string;
}

const LIGHT: BaseTheme = {
  dark: false,
  background: SCREEN_BG_LIGHT,
  textPrimary: TEXT_PRIMARY_LIGHT,
  textSecondary: TEXT_SECONDARY_LIGHT,
  card: CARD_LIGHT,
};

const DARK: BaseTheme = {
  dark: true,
  background: SCREEN_BG_DARK,
  textPrimary: TEXT_PRIMARY_DARK,
  textSecondary: TEXT_SECONDARY_DARK,
  card: CARD_DARK,
};

export function getTheme(darkMode: boolean): BaseTheme {
  return darkMode ? DARK : LIGHT;
}

export function useTheme(): BaseTheme {
  return getTheme(useSettingsStore((s) => s.darkMode));
}
