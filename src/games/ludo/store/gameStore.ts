import { create } from 'zustand';

import {
  applyAction,
  INITIAL_STATE,
  type GameAction,
} from '@/games/ludo/logic/gameReducer';
import type { SavedGame } from '@/games/ludo/logic/persistence';
import type { GameState, PlayerColor, PlayerConfig } from '@/games/ludo/types/game';

/**
 * Thin Zustand wrapper around the pure {@link applyAction} reducer. The store
 * only owns *where* state lives and *how* it's dispatched; every rule lives in
 * `gameReducer.ts`. Each method just builds a serialisable {@link GameAction}
 * and dispatches it — the same path a networked move will take later.
 *
 * The only non-reducer concern kept here is the local dice RNG: for hotseat we
 * roll the die and hand it to the action. An authoritative host will instead
 * supply the die, leaving the reducer untouched.
 */

interface GameActions {
  startGame: (playersConfig: PlayerConfig[]) => void;
  rollDice: () => void;
  selectToken: (tokenId: string) => void;
  moveToken: (tokenId: string) => void;
  resolveCapture: () => void;
  nextTurn: () => void;
  resetGame: () => void;
  restartGame: () => void;
  loadSavedGame: (saved: SavedGame) => void;
  /** Live-rename a player mid-game; empty falls back to the colour's label. */
  setPlayerName: (color: PlayerColor, name: string) => void;
  /**
   * Overwrite the whole game state with an authoritative snapshot received from
   * the network (online play). The UI renders from here just like a local game.
   */
  applyRemoteState: (state: GameState) => void;
}

export type GameStore = GameState & GameActions;

const DICE_MIN = 1;
const DICE_MAX = 6;

function rollDie(): number {
  return Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1)) + DICE_MIN;
}

export const useGameStore = create<GameStore>((set) => {
  // Illegal actions return the same state reference, so zustand skips the
  // update entirely — matching the old early-return guards.
  const dispatch = (action: GameAction) =>
    set((state) => applyAction(state, action));

  return {
    ...INITIAL_STATE,

    startGame: (playersConfig) =>
      dispatch({ type: 'START_GAME', config: playersConfig }),
    rollDice: () => dispatch({ type: 'ROLL_DICE', die: rollDie() }),
    selectToken: (tokenId) => dispatch({ type: 'SELECT_TOKEN', tokenId }),
    moveToken: (tokenId) => dispatch({ type: 'MOVE_TOKEN', tokenId }),
    resolveCapture: () => dispatch({ type: 'RESOLVE_CAPTURE' }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET' }),
    restartGame: () => dispatch({ type: 'RESTART' }),
    loadSavedGame: (saved) => dispatch({ type: 'LOAD', saved }),
    setPlayerName: (color, name) =>
      dispatch({ type: 'SET_PLAYER_NAME', color, name }),
    applyRemoteState: (state) => set(() => state),
  };
});
