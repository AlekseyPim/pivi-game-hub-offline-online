import { FINISH_PROGRESS, LAST_MAIN_PROGRESS } from '@/games/ludo/constants/board';
import { isSafeIndex, mainIndexForProgress } from '@/games/ludo/logic/boardPath';
import { findCapture, progressAfterMove } from '@/games/ludo/logic/rules';
import type { PlayerColor, Token } from '@/games/ludo/types/game';

/**
 * Stub seam for future AI players. The game is human-only for now, but the
 * store talks to bots exclusively through this interface, so dropping in a real
 * strategy later means implementing `chooseMove` — nothing else has to change.
 */

export interface BotMoveContext {
  color: PlayerColor;
  diceValue: number;
  tokens: Token[];
  /** Ids the rules have already deemed legal this turn. */
  movableTokenIds: string[];
}

export interface BotAdapter {
  /** Pick a token id to move, or null to pass. */
  chooseMove(context: BotMoveContext): Promise<string | null>;
}

/** Fallback that picks the first legal move, or passes. */
export const noopBotAdapter: BotAdapter = {
  async chooseMove({ movableTokenIds }: BotMoveContext): Promise<string | null> {
    return movableTokenIds.length > 0 ? movableTokenIds[0] : null;
  },
};

/** Chance the bot advances the 2nd-closest token instead of the closest. */
const SECOND_CHOICE_CHANCE = 0.3;
/** Chance the bot skips a preferred rule action (capture / leave base). */
const SKIP_CHANCE = 0.3;

/** True ~70% of the time — i.e. the bot actually takes the action. */
function shouldAct(): boolean {
  return Math.random() >= SKIP_CHANCE;
}

/** Would this move land the token exactly on the finish? */
function reachesFinish(token: Token, dice: number): boolean {
  return progressAfterMove(token, dice) === FINISH_PROGRESS;
}

/** Would this move land an on-path token on a safe square? */
function reachesSafety(token: Token, dice: number): boolean {
  if (token.status !== 'active') return false;
  const landing = progressAfterMove(token, dice);
  if (landing > LAST_MAIN_PROGRESS) return false;
  return isSafeIndex(mainIndexForProgress(token.color, landing));
}

/**
 * A simple, deliberately imperfect opponent. Priority order, but each preferred
 * action has a 30% chance of being skipped (falling through to the next):
 *  1. Capture an opponent if possible.
 *  2. Bring a token home to the finish.
 *  3. Move a token onto a safe square.
 *  4. Bring a token out of base (on a 6).
 *  5. Otherwise advance the token nearest the finish — 30% of the time, when
 *     more than one token can move, it picks the second-nearest instead.
 */
export const simpleBotAdapter: BotAdapter = {
  async chooseMove({
    diceValue,
    tokens,
    movableTokenIds,
  }: BotMoveContext): Promise<string | null> {
    if (movableTokenIds.length === 0) return null;

    const byId = (id: string) => tokens.find((t) => t.id === id)!;

    // 1. Capture (sometimes let it slide).
    const capturing = movableTokenIds.find((id) =>
      findCapture(tokens, byId(id), diceValue),
    );
    if (capturing && shouldAct()) return capturing;

    // 2. Finish a token.
    const finishing = movableTokenIds.find((id) =>
      reachesFinish(byId(id), diceValue),
    );
    if (finishing && shouldAct()) return finishing;

    // 3. Reach a safe square.
    const toSafety = movableTokenIds.find((id) =>
      reachesSafety(byId(id), diceValue),
    );
    if (toSafety && shouldAct()) return toSafety;

    // 4. Leave base (sometimes hold off).
    const leaving = movableTokenIds.find((id) => byId(id).status === 'base');
    if (leaving && shouldAct()) return leaving;

    // 5. Advance, ranked by closeness to home (highest progress first).
    const ranked = [...movableTokenIds].sort(
      (a, b) => byId(b).progress - byId(a).progress,
    );
    if (ranked.length > 1 && Math.random() < SECOND_CHOICE_CHANCE) {
      return ranked[1];
    }
    return ranked[0];
  },
};
