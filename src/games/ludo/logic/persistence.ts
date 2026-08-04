import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameState } from '@/games/ludo/types/game';

/**
 * Tiny save-game layer on top of AsyncStorage. We persist only the durable part
 * of the game (board position and whose turn it is); transient per-turn fields
 * (dice, selection, movable ids) are recomputed on load, so a resumed game
 * always starts cleanly at the current player's roll.
 */

const SAVE_KEY = 'ludo:savegame:v1';

export type SavedGame = Pick<
  GameState,
  | 'players'
  | 'tokens'
  | 'currentPlayerIndex'
  | 'rankings'
  | 'moveCount'
  | 'captures'
>;

export async function saveGame(state: SavedGame): Promise<void> {
  const payload: SavedGame = {
    players: state.players,
    tokens: state.tokens,
    currentPlayerIndex: state.currentPlayerIndex,
    rankings: state.rankings,
    moveCount: state.moveCount,
    captures: state.captures,
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export async function loadGame(): Promise<SavedGame | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed.players?.length || !parsed.tokens?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function hasSavedGame(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  return raw != null;
}

export async function clearSavedGame(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}
