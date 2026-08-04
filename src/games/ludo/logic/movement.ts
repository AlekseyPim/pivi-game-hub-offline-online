import { FINISH_PROGRESS, LAST_MAIN_PROGRESS } from '@/games/ludo/constants/board';
import { findCaptures, progressAfterMove } from '@/games/ludo/logic/rules';
import type { Token, TokenStatus } from '@/games/ludo/types/game';

/**
 * Pure token-array transformations. Given the current tokens and a move, return
 * the next tokens array plus a description of what happened. The store wires
 * these into Zustand; nothing here knows about React.
 */

export interface MoveResult {
  tokens: Token[];
  /** Ids of every opponent token sent home by this move. */
  capturedTokenIds: string[];
  /** True if the moved token reached the finish on this move. */
  reachedFinish: boolean;
}

/** Derive the lifecycle status that matches a given progress value. */
export function statusForProgress(progress: number): TokenStatus {
  if (progress >= FINISH_PROGRESS) return 'finished';
  if (progress > LAST_MAIN_PROGRESS) return 'homePath';
  return 'active';
}

/**
 * Apply a single token move and any resulting capture.
 * Assumes the move has already been validated by the rules.
 */
export function applyMove(
  tokens: Token[],
  tokenId: string,
  dice: number,
): MoveResult {
  const mover = tokens.find((t) => t.id === tokenId);
  if (!mover) {
    return { tokens, capturedTokenIds: [], reachedFinish: false };
  }

  const capturedTokenIds = findCaptures(tokens, mover, dice);
  const nextProgress = progressAfterMove(mover, dice);
  const nextStatus = statusForProgress(nextProgress);

  const nextTokens = tokens.map((token) => {
    if (token.id === mover.id) {
      return { ...token, progress: nextProgress, status: nextStatus };
    }
    if (capturedTokenIds.includes(token.id)) {
      return sendToBase(token);
    }
    return token;
  });

  return {
    tokens: nextTokens,
    capturedTokenIds,
    reachedFinish: nextStatus === 'finished',
  };
}

/** Reset a token to its base. */
export function sendToBase(token: Token): Token {
  return { ...token, status: 'base', progress: -1 };
}
