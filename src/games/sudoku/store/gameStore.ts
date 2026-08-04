import { create } from 'zustand';

import {
  clearCell,
  createGame,
  INITIAL_STATE,
  setValue,
  toggleNote,
  type CreateGameOptions,
} from '@/games/sudoku/logic/gameReducer';
import { shotFeedback } from '@/shared/logic/haptics';
import { useFireworksStore } from '@/shared/store/fireworksStore';
import { useSupporterStore } from '@/shared/store/supporterStore';
import type { Difficulty, GameState } from '@/games/sudoku/types/game';

/**
 * Zustand wrapper around the pure reducer. It owns *where* state lives and
 * nothing else — every rule is in `gameReducer.ts`.
 *
 * Single player dispatches straight into the reducer. Online play never
 * dispatches here: sudoku hides nothing, so the match is host-authoritative and
 * the online store feeds finished snapshots in through
 * {@link applyRemoteState} — the same UI renders both.
 */

/** Multicolour salute on a win — gold for supporters (a cosmetic perk). */
function celebrate(): void {
  useFireworksStore
    .getState()
    .celebrate({ gold: useSupporterStore.getState().isSupporter });
}

interface GameActions {
  startLocal: (difficulty: Difficulty, playerName: string) => void;
  startOnline: (opts: CreateGameOptions) => void;
  /** Write a digit in our own territory (0 clears). */
  write: (index: number, value: number) => void;
  /** Toggle one pencil mark. */
  note: (index: number, digit: number) => void;
  /** Wipe a cell. */
  erase: (index: number) => void;
  loadSavedGame: (state: GameState) => void;
  /**
   * Overwrite with an authoritative snapshot from the host. `mySlot` travels
   * separately: the snapshot is shared by both devices, so the seat in it is
   * the host's and must be replaced with our own.
   */
  applyRemoteState: (state: GameState, mySlot: number) => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => {
  /** Apply a new state, watching for the end of the game. */
  const commit = (next: GameState): void => {
    const previous = get();
    set(next);
    if (next.phase === 'finished' && previous.phase !== 'finished') {
      if (next.winner === next.mySlot) celebrate();
    }
  };

  return {
    ...INITIAL_STATE,

    startLocal: (difficulty, playerName) =>
      set(
        createGame({
          difficulty,
          online: false,
          mySlot: 0,
          players: [{ name: playerName }],
        }),
      ),

    startOnline: (opts) => set(createGame(opts)),

    write: (index, value) => {
      const state = get();
      const next = setValue(state, state.mySlot, index, value);
      if (next === state) return;
      // A quiet tap on every digit; the win gets the heavier one.
      shotFeedback(next.phase === 'finished' ? 'sunk' : 'hit');
      commit(next);
    },

    note: (index, digit) => {
      const state = get();
      set(toggleNote(state, state.mySlot, index, digit));
    },

    erase: (index) => {
      const state = get();
      set(clearCell(state, state.mySlot, index));
    },

    loadSavedGame: (state) => set(state),
    applyRemoteState: (state, mySlot) => commit({ ...state, mySlot }),
    resetGame: () => set({ ...INITIAL_STATE }),
  };
});
