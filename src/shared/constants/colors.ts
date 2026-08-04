/**
 * The hub's own palette — screen chrome shared by every game (backgrounds, cards,
 * the accent on buttons and links).
 *
 * A game only overrides what its board needs: `games/<id>/constants/colors.ts`
 * keeps the board-specific tokens and re-exports nothing from here, so tweaking
 * a game's grid can never repaint the hub.
 */

export const SCREEN_BG_LIGHT = '#FAFAFA';
export const SCREEN_BG_DARK = '#12141A';

export const CARD_LIGHT = '#FFFFFF';
export const CARD_DARK = '#1E2129';

export const TEXT_PRIMARY_LIGHT = '#212121';
export const TEXT_PRIMARY_DARK = '#FFFFFF';
export const TEXT_SECONDARY_LIGHT = '#616161';
export const TEXT_SECONDARY_DARK = '#B7BDC9';

/** Accent used for primary buttons, links and active states across the hub. */
export const ACCENT = '#5B8DEF';
