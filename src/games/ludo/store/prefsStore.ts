import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Preferences that belong to ludo alone — currently just fast mode. App-wide
 * preferences (theme, language, haptics, online name) live in
 * `shared/store/settingsStore`.
 */

const PREFS_KEY = 'ludo:prefs:v1';

interface PrefsState {
  /** Skip bot think delays and shorten the dice-roll animation. */
  fastMode: boolean;
  /** False until the persisted value has been read back at startup. */
  hydrated: boolean;
}

interface PrefsActions {
  setFastMode: (value: boolean) => void;
  hydrate: () => Promise<void>;
}

export type PrefsStore = PrefsState & PrefsActions;

export const usePrefsStore = create<PrefsStore>((set, get) => {
  const persist = () => {
    const { fastMode } = get();
    void AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ fastMode }));
  };

  return {
    fastMode: false,
    hydrated: false,

    setFastMode: (value) => {
      set({ fastMode: value });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { fastMode?: boolean };
          set({ fastMode: Boolean(parsed.fastMode), hydrated: true });
          return;
        }
      } catch {
        // Corrupt or unreadable state falls back to the normal pace.
      }
      set({ hydrated: true });
    },
  };
});
