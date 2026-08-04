import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { LANGUAGES, type Language } from '@/shared/i18n/translations';

/**
 * App-wide preferences (dark theme, language, haptics, remembered
 * online name), kept apart from game state so toggling them never disturbs a
 * match. Persisted to AsyncStorage and rehydrated once at startup.
 */

const SETTINGS_KEY = 'hub:settings:v1';
const DEFAULT_LANGUAGE: Language = 'ru';

interface SettingsState {
  darkMode: boolean;
  language: Language;
  /** Vibrate on hits and sinkings. */
  haptics: boolean;
  onlineName: string;
  hydrated: boolean;
}

interface SettingsActions {
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  setLanguage: (language: Language) => void;
  setHaptics: (value: boolean) => void;
  setOnlineName: (name: string) => void;
  hydrate: () => Promise<void>;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const persist = () => {
    const { darkMode, language, haptics, onlineName } = get();
    void AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ darkMode, language, haptics, onlineName }),
    );
  };

  return {
    darkMode: true,
    language: DEFAULT_LANGUAGE,
    haptics: true,
    onlineName: '',
    hydrated: false,

    setDarkMode: (value) => {
      set({ darkMode: value });
      persist();
    },
    toggleDarkMode: () => get().setDarkMode(!get().darkMode),
    setLanguage: (language) => {
      set({ language });
      persist();
    },
    setHaptics: (value) => {
      set({ haptics: value });
      persist();
    },
    setOnlineName: (name) => {
      set({ onlineName: name });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SettingsState>;
          const language =
            parsed.language && LANGUAGES.includes(parsed.language)
              ? parsed.language
              : DEFAULT_LANGUAGE;
          set({
            darkMode: Boolean(parsed.darkMode),
            language,
            haptics: parsed.haptics !== false,
            onlineName: parsed.onlineName ?? '',
            hydrated: true,
          });
          return;
        }
      } catch {
        // Corrupt or unreadable settings fall back to defaults.
      }
      set({ hydrated: true });
    },
  };
});
