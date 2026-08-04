import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { clampMineDensity, MIN_MINE_DENSITY } from '@/games/minesweeper/constants/board';
import type { BoardSize, Difficulty, TurnMode } from '@/games/minesweeper/types/game';

/**
 * Persisted pre-game choices shared by the local menu and the online host: board
 * size, difficulty, mine density and (multiplayer) turn mode. Kept separate from
 * the live game so choices survive an app restart and never interfere with a
 * running match.
 */

const SETUP_KEY = 'minesweeper:setup:v1';

interface SetupState {
  size: BoardSize;
  difficulty: Difficulty;
  /** Mine-count multiplier, 1.0–1.5. See constants/board. */
  mineDensity: number;
  turnMode: TurnMode;
  hydrated: boolean;
}

interface SetupActions {
  setSize: (size: BoardSize) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setMineDensity: (density: number) => void;
  setTurnMode: (mode: TurnMode) => void;
  hydrate: () => Promise<void>;
}

export type SetupStore = SetupState & SetupActions;

export const useSetupStore = create<SetupStore>((set, get) => {
  const persist = () => {
    const { size, difficulty, mineDensity, turnMode } = get();
    void AsyncStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ size, difficulty, mineDensity, turnMode }),
    );
  };

  return {
    size: 9,
    difficulty: 'easy',
    mineDensity: MIN_MINE_DENSITY,
    turnMode: 'parallel',
    hydrated: false,

    setSize: (size) => {
      set({ size });
      persist();
    },
    setDifficulty: (difficulty) => {
      set({ difficulty });
      persist();
    },
    setMineDensity: (density) => {
      set({ mineDensity: clampMineDensity(density) });
      persist();
    },
    setTurnMode: (turnMode) => {
      set({ turnMode });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SETUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SetupState>;
          set({
            size: parsed.size === 16 ? 16 : 9,
            difficulty: parsed.difficulty === 'normal' ? 'normal' : 'easy',
            mineDensity: clampMineDensity(
              typeof parsed.mineDensity === 'number'
                ? parsed.mineDensity
                : MIN_MINE_DENSITY,
            ),
            turnMode: parsed.turnMode === 'sequential' ? 'sequential' : 'parallel',
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
