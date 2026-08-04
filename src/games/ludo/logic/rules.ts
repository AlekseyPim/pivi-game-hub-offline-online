import { FINISH_PROGRESS, LAST_MAIN_PROGRESS } from '@/games/ludo/constants/board';
import { mainIndexForProgress, isSafeIndex } from '@/games/ludo/logic/boardPath';
import type { PlayerColor, Token } from '@/games/ludo/types/game';

/**
 * The Ludo rule book, as pure functions over token arrays. No store, no UI.
 *
 * Rules implemented:
 *  1. A token leaves base only on a 6.
 *  2. Rolling a 6 grants another turn (handled in the store via the dice value).
 *  3. Landing on an opponent sends it back to base...
 *  4. ...unless that square is a safe square.
 *  5. A token may not move past the finish.
 *  6. If no move is possible, the turn passes.
 *  7. A player wins when all four tokens are finished.
 */

export const DICE_TO_LEAVE_BASE = 6;

/** All tokens belonging to a colour. */
export function tokensForColor(tokens: Token[], color: PlayerColor): Token[] {
  return tokens.filter((t) => t.color === color);
}

/** Can this specific token legally move with the given dice value? */
export function canMoveToken(token: Token, dice: number): boolean {
  if (token.status === 'finished') {
    return false;
  }
  if (token.status === 'base') {
    // Rule 1: only a 6 frees a token.
    return dice === DICE_TO_LEAVE_BASE;
  }
  // Rule 5: cannot overshoot the finish.
  return token.progress + dice <= FINISH_PROGRESS;
}

/** Ids of the current player's tokens that can move with this dice value. */
export function getMovableTokenIds(
  tokens: Token[],
  color: PlayerColor,
  dice: number,
): string[] {
  return tokensForColor(tokens, color)
    .filter((token) => canMoveToken(token, dice))
    .map((token) => token.id);
}

/** Resulting progress after moving a token (base tokens land on progress 0). */
export function progressAfterMove(token: Token, dice: number): number {
  if (token.status === 'base') {
    return 0;
  }
  return token.progress + dice;
}

/**
 * All opponent tokens that would be captured if `mover` lands after `dice` —
 * every opponent piece sharing the landing square is sent home. Implements
 * rules 3 & 4.
 */
export function findCaptures(
  tokens: Token[],
  mover: Token,
  dice: number,
): string[] {
  const landingProgress = progressAfterMove(mover, dice);

  // Captures only happen on the shared main path, never on home stretches.
  if (landingProgress > LAST_MAIN_PROGRESS) {
    return [];
  }

  const landingIndex = mainIndexForProgress(mover.color, landingProgress);

  // Rule 4: safe squares protect everyone.
  if (isSafeIndex(landingIndex)) {
    return [];
  }

  return tokens
    .filter(
      (other) =>
        other.color !== mover.color &&
        other.status === 'active' &&
        mainIndexForProgress(other.color, other.progress) === landingIndex,
    )
    .map((other) => other.id);
}

/** Whether `mover` landing after `dice` would capture at least one opponent. */
export function findCapture(
  tokens: Token[],
  mover: Token,
  dice: number,
): string | null {
  return findCaptures(tokens, mover, dice)[0] ?? null;
}

/** Rule 7: every token of the colour has finished. */
export function hasPlayerWon(tokens: Token[], color: PlayerColor): boolean {
  const own = tokensForColor(tokens, color);
  return own.length > 0 && own.every((t) => t.status === 'finished');
}

/** Rule 2: rolling a 6 earns another turn. */
export function grantsExtraTurn(dice: number): boolean {
  return dice === DICE_TO_LEAVE_BASE;
}
