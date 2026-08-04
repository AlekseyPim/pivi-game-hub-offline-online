import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { GameMode } from '@/games/battleship/types/game';

/**
 * Persisted pre-game choices shared by the local menu and the online host: the
 * game mode and whether the fleet should be arranged automatically. Kept apart
 * from the live game so choices survive a restart and never disturb a match.
 */

const SETUP_KEY = 'battleship:setup:v1';

interface SetupState {
  mode: GameMode;
  /** Skip manual placement and start with a randomly arranged fleet. */
  autoPlace: boolean;
  hydrated: boolean;
}

interface SetupActions {
  setMode: (mode: GameMode) => void;
  setAutoPlace: (value: boolean) => void;
  hydrate: () => Promise<void>;
}

export type SetupStore = SetupState & SetupActions;

export const useSetupStore = create<SetupStore>((set, get) => {
  const persist = () => {
    const { mode, autoPlace } = get();
    void AsyncStorage.setItem(SETUP_KEY, JSON.stringify({ mode, autoPlace }));
  };

  return {
    mode: 'classic',
    autoPlace: false,
    hydrated: false,

    setMode: (mode) => {
      set({ mode });
      persist();
    },
    setAutoPlace: (autoPlace) => {
      set({ autoPlace });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SETUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SetupState>;
          set({
            mode: parsed.mode === 'moving' ? 'moving' : 'classic',
            autoPlace: Boolean(parsed.autoPlace),
            hydrated: true,
          });
          return;
        }
      } catch {
        // Corrupt setup falls back to defaults.
      }
      set({ hydrated: true });
    },
  };
});
