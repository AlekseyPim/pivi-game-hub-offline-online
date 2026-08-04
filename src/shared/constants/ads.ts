import { Platform } from 'react-native';

import type { GameId } from '@/shared/games/ids';

/**
 * AdMob configuration and the secret "remove ads" unlock code — one set for the
 * whole hub, because it is one app with one AdMob account behind it.
 *
 * Placements:
 *  - a banner pinned under each game's menu and under its board;
 *  - a rewarded ad on every Nth game start (local starts and, online, only on
 *    the host's start). The cadence is per game — see {@link REWARDED_START_EVERY_N}.
 *
 * Ads are hidden for supporters (bought a coffee) and for anyone who entered the
 * secret unlock code (`adFreeStore.adFree`) — that removes ads only and grants no
 * other perks. Both flags are device-wide, so a coffee bought in one game removes
 * ads in all of them.
 *
 * TODO before release: create the hub's ad units in the AdMob console and paste
 * the ids below. While they are empty — and always in development — the code
 * falls back to Google's test ads, so nothing crashes and you never earn policy
 * strikes on your own account. The app ids in `app.json` are Google's test app
 * ids and must be replaced too.
 */

const PROD_INTERSTITIAL = Platform.select({ ios: '', android: '', default: '' });
/** Production interstitial unit for the current platform ('' until you set it). */
export const PROD_INTERSTITIAL_UNIT_ID: string = PROD_INTERSTITIAL ?? '';

const PROD_REWARDED = Platform.select({ ios: '', android: '', default: '' });
/** Production rewarded unit for the current platform ('' until you set it). */
export const PROD_REWARDED_UNIT_ID: string = PROD_REWARDED ?? '';

const PROD_BANNER = Platform.select({ ios: '', android: '', default: '' });
/** Production banner unit for the current platform ('' until you set it). */
export const PROD_BANNER_UNIT_ID: string = PROD_BANNER ?? '';

// --- Feature flags (flip to false to kill a placement instantly) -----------
/** Banner pinned to the bottom of the hub's game list. */
export const SHOW_HUB_BANNER = true;
/** Banner pinned to the bottom of a game's main menu. */
export const SHOW_MENU_BANNER = true;
/** Banner pinned to the bottom of the board screen during play. */
export const SHOW_BOARD_BANNER = true;
/** Banner pinned to the bottom of minesweeper's board-setup sheet. */
export const SHOW_SETUP_MODAL_BANNER = true;
/** Banner pinned to the bottom of battleship's fleet-placement screen. */
export const SHOW_PLACEMENT_BANNER = false;
/** Banner pinned to the bottom of ludo's start-game confirmation sheet. */
export const SHOW_START_MODAL_BANNER = true;

/**
 * Show the start rewarded ad on every Nth game start, counted per game: `3` =
 * every third sudoku (starts 3, 6, 9 …), regardless of how much minesweeper was
 * played in between. Applies to both local and online starts. `1` = every start.
 *
 * These are the cadences the four standalone apps shipped with.
 */
export const REWARDED_START_EVERY_N: Record<GameId, number> = {
  sudoku: 3,
  minesweeper: 2,
  battleship: 3,
  ludo: 2,
};

// --- Secret unlock code ----------------------------------------------------
/**
 * SHA-256 of the trimmed, lowercased unlock code. The plaintext is NEVER stored
 * in the app — only this digest ships. Current code: `pivigames`.
 *
 * One code for the whole hub: it replaces the four per-app codes the standalone
 * builds used (`pivimines`, `pivifleet`, …), which do not work here.
 *
 * To change it, compute a fresh digest and paste it here:
 *   printf '%s' 'your-new-code' | shasum -a 256
 * Verification lowercases + trims the input before hashing.
 */
export const AD_FREE_CODE_SHA256 =
  '860b2cc88e9e28bbcbb495ba8de8449826d64068f814aff5dc13317d3a03cbb6';

/**
 * Print the ad lifecycle to the console (`[ads] …`). Handy while diagnosing why
 * an ad does not appear; turn it off before shipping to keep the logs quiet.
 */
export const AD_DEBUG = true;

/** Taps on the logo required to reveal the hidden unlock modal. */
export const SECRET_TAP_COUNT = 5;
/** Consecutive logo taps must land within this window (ms) to count. */
export const SECRET_TAP_WINDOW_MS = 3000;
