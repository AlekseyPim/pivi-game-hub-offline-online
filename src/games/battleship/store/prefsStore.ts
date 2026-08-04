import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  BOARD_PALETTES,
  DEFAULT_BOARD_PALETTE,
} from '@/games/battleship/constants/colors';

/**
 * Preferences that belong to battleship alone — currently just the water/hull
 * palette. App-wide preferences (theme, language, haptics, online name) live in
 * `shared/store/settingsStore`.
 */

const PREFS_KEY = 'battleship:prefs:v1';

interface PrefsState {
  /** Selected board colour palette key (see constants/colors BOARD_PALETTES). */
  boardTheme: string;
  /** False until the persisted value has been read back at startup. */
  hydrated: boolean;
}

interface PrefsActions {
  setBoardTheme: (key: string) => void;
  hydrate: () => Promise<void>;
}

export type PrefsStore = PrefsState & PrefsActions;

export const usePrefsStore = create<PrefsStore>((set, get) => {
  const persist = () => {
    const { boardTheme } = get();
    void AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ boardTheme }));
  };

  return {
    boardTheme: DEFAULT_BOARD_PALETTE,
    hydrated: false,

    setBoardTheme: (key) => {
      set({ boardTheme: key });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { boardTheme?: string };
          // A palette that no longer exists (renamed, dropped) falls back to the
          // default rather than painting the sea with undefined.
          const boardTheme =
            parsed.boardTheme && BOARD_PALETTES.some((p) => p.key === parsed.boardTheme)
              ? parsed.boardTheme
              : DEFAULT_BOARD_PALETTE;
          set({ boardTheme, hydrated: true });
          return;
        }
      } catch {
        // Corrupt or unreadable state falls back to the default palette.
      }
      set({ hydrated: true });
    },
  };
});
