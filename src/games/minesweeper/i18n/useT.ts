import { useSettingsStore } from '@/shared/store/settingsStore';
import { agreementByLang, t, type Language } from '@/games/minesweeper/i18n/translations';

type Params = Record<string, string | number>;

/** Returns a `t(key, params?)` translator bound to the current language. */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return (key: string, params?: Params) => t(lang, key, params);
}

export function useLanguage(): Language {
  return useSettingsStore((s) => s.language);
}

/** The terms-of-use title + body in the current language. */
export function useAgreement() {
  return agreementByLang[useLanguage()];
}
