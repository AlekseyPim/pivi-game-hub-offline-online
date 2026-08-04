import { create } from 'zustand';

import { clearSavedGame, loadGame, saveGame } from '@/games/sudoku/logic/persistence';
import type { GameState } from '@/games/sudoku/types/game';

/**
 * Reactive wrapper around the one-slot {@link persistence} layer so the menu can
 * show / hide "Continue" and the pause menu can save. Holds only a `hasSave`
 * flag; the blob itself lives in AsyncStorage.
 */

interface SaveStore {
  hasSave: boolean;
  hydrate: () => Promise<void>;
  save: (state: GameState) => Promise<void>;
  load: () => Promise<GameState | null>;
  clear: () => Promise<void>;
}

export const useSaveStore = create<SaveStore>((set) => ({
  hasSave: false,
  hydrate: async () => set({ hasSave: (await loadGame()) != null }),
  save: async (state) => {
    await saveGame(state);
    set({ hasSave: true });
  },
  load: async () => loadGame(),
  clear: async () => {
    await clearSavedGame();
    set({ hasSave: false });
  },
}));
