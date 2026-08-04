import { applyAction } from '@/games/minesweeper/logic/gameReducer';
import type { Intent } from '@/games/minesweeper/net/protocol';
import type { GameState } from '@/games/minesweeper/types/game';

/**
 * Turn a player's intent into an authoritative state transition. The reducer
 * itself enforces ownership and turn order, so an out-of-turn or wrong-territory
 * intent simply returns the SAME reference (a no-op the caller can detect).
 *
 * `slot` is the player's seat index (null = spectator with no seat).
 */
export function reduceIntent(
  state: GameState,
  slot: number | null,
  intent: Intent,
): GameState {
  if (slot == null) return state;
  switch (intent.kind) {
    case 'reveal':
      return applyAction(state, {
        type: 'REVEAL',
        index: intent.index,
        player: slot,
      });
    case 'mark':
      if (intent.mode === 'cycle') {
        return applyAction(state, {
          type: 'CYCLE_MARK',
          index: intent.index,
          player: slot,
        });
      }
      if (intent.mode === 'clear') {
        return applyAction(state, {
          type: 'CLEAR_MARK',
          index: intent.index,
          player: slot,
        });
      }
      return applyAction(state, {
        type: 'TOGGLE_MARK',
        index: intent.index,
        player: slot,
        mark: intent.mode,
      });
  }
}
