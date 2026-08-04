import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameState } from '@/games/battleship/types/game';

/**
 * One-slot save game on top of AsyncStorage. Only local games are saved (an
 * online match is a live duel and can't be resumed offline). The whole
 * {@link GameState} is plain data, so we persist it verbatim — and because the
 * bot derives every decision from the board, it resumes without losing its
 * train of thought.
 */

const SAVE_KEY = 'battleship:savegame:v1';

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
    if (!state?.boards?.length || state.boards.length !== 2) return null;
    if (!state.boards[0]?.marks?.length || !state.players?.length) return null;
    if (state.online) return null;
    return state;
  } catch {
    return null;
  }
}

export async function clearSavedGame(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}
