import { useSettingsStore } from '@/shared/store/settingsStore';

import {
  agreementByLang,
  rulesByLang,
  t,
  type Language,
} from '@/games/ludo/i18n/translations';

type Params = Record<string, string | number>;

/** Returns a `t(key, params)` bound to the current language. */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return (key: string, params?: Params) => t(lang, key, params);
}

export function useLanguage(): Language {
  return useSettingsStore((s) => s.language);
}

export function useRules() {
  return rulesByLang[useLanguage()];
}

export function useAgreement() {
  return agreementByLang[useLanguage()];
}
