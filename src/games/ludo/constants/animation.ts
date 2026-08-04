/**
 * Shared animation timings so the board overlay (move-path highlight) can stay
 * perfectly in sync with the token's hopping motion.
 */

/** Milliseconds per single cell hop when walking the path. */
export const STEP_DURATION = 240;

/** Direct move duration (leaving base). */
export const JUMP_DURATION = 280;

/** Slow, deliberate slide a captured token takes back to its base. */
export const CAPTURE_RETURN_DURATION = JUMP_DURATION * 4;

/** Relative size of a token compared to one board cell. */
export const TOKEN_SCALE = 0.9;
