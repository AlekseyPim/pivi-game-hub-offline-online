/**
 * In-app purchase product configuration — a hybrid "buy me a coffee" model,
 * one set of products for the whole hub.
 *
 * The FIRST coffee is a *non-consumable* "Supporter" unlock: it grants the
 * cosmetic perks (thank-you screen, gold victory salute, ad-free) forever and
 * survives a reinstall / device switch because non-consumables can be restored
 * from the store (`getAvailablePurchases`).
 *
 * Every coffee AFTER that is a *consumable* tip: buyable any number of times,
 * it just bumps the coffee counter.
 *
 * Supporter status is device-wide, not per game: one coffee removes ads and
 * unlocks the gold salute in sudoku, minesweeper, battleship and ludo alike.
 *
 * Both product ids must be created in App Store Connect and the Google Play
 * Console with the matching type (non-consumable / consumable) before purchases
 * work on a real build. The four standalone apps' products (`sudoku_supporter`,
 * `ludo_coffee`, …) belong to other bundle ids and cannot be restored here.
 */

/** Non-consumable "become a supporter" unlock (the first coffee). Restorable. */
export const SUPPORTER_PRODUCT_ID = 'pivigames_supporter';

/** Consumable tip for every coffee after the first. Not restorable by design. */
export const COFFEE_PRODUCT_ID = 'pivigames_coffee';

/** All product ids we fetch on connect. */
export const IAP_PRODUCT_IDS: string[] = [SUPPORTER_PRODUCT_ID, COFFEE_PRODUCT_ID];

/** Shown while the store price is still loading or unavailable. */
export const COFFEE_FALLBACK_PRICE = '☕';
