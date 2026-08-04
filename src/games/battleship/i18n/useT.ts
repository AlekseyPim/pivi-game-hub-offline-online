import { useSettingsStore } from '@/shared/store/settingsStore';
import {
  agreementByLang,
  isCyrillic,
  t,
  type Language,
} from '@/games/battleship/i18n/translations';

type Params = Record<string, string | number>;

/** Returns a `t(key, params?)` translator bound to the current language. */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return (key: string, params?: Params) => t(lang, key, params);
}

export function useLanguage(): Language {
  return useSettingsStore((s) => s.language);
}

/** True when the board should be lettered in Cyrillic rather than Latin. */
export function useCyrillicBoard(): boolean {
  return isCyrillic(useLanguage());
}

/** The terms-of-use title + body in the current language. */
export function useAgreement() {
  return agreementByLang[useLanguage()];
}
