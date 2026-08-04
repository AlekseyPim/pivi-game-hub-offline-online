import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DIFFICULTIES } from '@/games/sudoku/constants/board';
import type { Difficulty } from '@/games/sudoku/types/game';

/**
 * Persisted pre-game choice — the difficulty — shared by the menu and the
 * online host. Kept apart from the live game so it survives a restart and never
 * disturbs a running puzzle.
 */

const SETUP_KEY = 'sudoku:setup:v1';

interface SetupState {
  difficulty: Difficulty;
  hydrated: boolean;
}

interface SetupActions {
  setDifficulty: (difficulty: Difficulty) => void;
  hydrate: () => Promise<void>;
}

export type SetupStore = SetupState & SetupActions;

export const useSetupStore = create<SetupStore>((set, get) => ({
  difficulty: 'easy',
  hydrated: false,

  setDifficulty: (difficulty) => {
    set({ difficulty });
    void AsyncStorage.setItem(SETUP_KEY, JSON.stringify({ difficulty }));
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SetupState>;
        set({
          difficulty: DIFFICULTIES.includes(parsed.difficulty as Difficulty)
            ? (parsed.difficulty as Difficulty)
            : 'easy',
          hydrated: true,
        });
        return;
      }
    } catch {
      // Corrupt setup falls back to defaults.
    }
    set({ hydrated: true });
  },
}));
