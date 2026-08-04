import AsyncStorage from '@react-native-async-storage/async-storage';

import { CELLS } from '@/games/sudoku/constants/board';
import type { GameState } from '@/games/sudoku/types/game';

/**
 * One-slot save game on top of AsyncStorage. Only single-player games are
 * saved: an online duel is a live race and cannot be resumed offline. The whole
 * {@link GameState} is plain data, so we persist it verbatim.
 */

const SAVE_KEY = 'sudoku:savegame:v1';

export interface SavedGame {
  version: 1;
  savedAt: number;
  state: GameState;
}

export async function saveGame(state: GameState): Promise<void> {
  const payload: SavedGame = { version: 1, savedAt: Date.now(), state };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export async function loadGame(): Promise<GameState | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedGame;
    const state = parsed?.state;
    // Sanity-check the essentials before trusting the blob.
    if (state?.cells?.length !== CELLS) return null;
    if (state.solution?.length !== CELLS) return null;
    if (state.online) return null;
    return state;
  } catch {
    return null;
  }
}

export async function clearSavedGame(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}
