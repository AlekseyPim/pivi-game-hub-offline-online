import { create } from 'zustand';

import { createGame, type CreateGameOptions } from '@/games/minesweeper/logic/boardGen';
import { applyAction, INITIAL_STATE } from '@/games/minesweeper/logic/gameReducer';
import type { GameState } from '@/games/minesweeper/types/game';

/**
 * Thin Zustand wrapper around the pure reducer. It owns *where* state lives and
 * *how* it's dispatched; every rule lives in `gameReducer.ts`. Local play always
 * acts as player 0. Online play never dispatches here — the online store feeds
 * authoritative snapshots in via {@link applyRemoteState}, so the same UI renders
 * both modes.
 */

interface GameActions {
  /** Start a fresh local single-player game. */
  startLocal: (opts: CreateGameOptions) => void;
  /** Local reveal (player 0). */
  reveal: (index: number) => void;
  /** Local flag → question → clear (player 0, long-press). */
  cycleMark: (index: number) => void;
  /** Local toggle of one specific mark (player 0, mode buttons). */
  toggleMark: (index: number, mark: 'flag' | 'question') => void;
  /** Local clear of any mark (player 0, clear mode). */
  clearMark: (index: number) => void;
  resetGame: () => void;
  /** Load a previously saved local game. */
  loadGame: (state: GameState) => void;
  /** Overwrite with an authoritative snapshot received over the network. */
  applyRemoteState: (state: GameState) => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL_STATE,

  startLocal: (opts) => set(() => createGame(opts)),
  reveal: (index) =>
    set((state) => applyAction(state, { type: 'REVEAL', index, player: 0 })),
  cycleMark: (index) =>
    set((state) => applyAction(state, { type: 'CYCLE_MARK', index, player: 0 })),
  toggleMark: (index, mark) =>
    set((state) => applyAction(state, { type: 'TOGGLE_MARK', index, player: 0, mark })),
  clearMark: (index) =>
    set((state) => applyAction(state, { type: 'CLEAR_MARK', index, player: 0 })),
  resetGame: () => set(() => ({ ...INITIAL_STATE })),
  loadGame: (state) => set(() => state),
  applyRemoteState: (state) => set(() => state),
}));
