import { clearCell, setValue, toggleNote } from '@/games/sudoku/logic/gameReducer';
import type { Intent } from '@/games/sudoku/net/protocol';
import type { GameState } from '@/games/sudoku/types/game';

/**
 * Turn a player's intent into an authoritative state transition.
 *
 * The reducer itself enforces territory and phase, so an intent aimed at
 * somebody else's cell simply returns the SAME reference — a no-op the caller
 * can detect and decline to broadcast.
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
    case 'value':
      return setValue(state, slot, intent.index, intent.value);
    case 'note':
      return toggleNote(state, slot, intent.index, intent.digit);
    case 'erase':
      return clearCell(state, slot, intent.index);
  }
}
