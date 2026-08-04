import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { AppState, Platform } from 'react-native';

import { useAdGateStore } from '@/shared/store/adGateStore';

import {
  AD_DEBUG,
  PROD_REWARDED_UNIT_ID,
  REWARDED_START_EVERY_N,
} from '@/shared/constants/ads';
import type { GameId } from '@/shared/games/ids';

/**
 * Thin wrapper around react-native-google-mobile-ads for the rewarded ad (the
 * only full-screen format this app uses; banners live in `AdBanner`). Shown at
 * game start (every Nth start) and when leaving a won game.
 *
 *  - lazy, web-safe access to the native module (the lib has no web build);
 *  - SDK init + first preload; reload-after-close so the next one is ready;
 *  - `maybeShow…` resolves only once the ad is dismissed, so the game continues
 *    after the ad closes (with a safety timeout so it can never hang).
 *
 * Every entry point is a no-op when ads can't or shouldn't run.
 */

type AdsModule = typeof import('react-native-google-mobile-ads');
type Rewarded = import('react-native-google-mobile-ads').RewardedAd;

/**
 * Diagnostic trace of the whole ad lifecycle, prefixed so it can be filtered out
 * of the Metro / Xcode console with a single search for `[ads]`.
 *
 * Deliberately not gated on `__DEV__`: the interesting failures (no fill, a unit
 * id that is wrong only in production) happen in release builds, and a handful
 * of lines per game is a price worth paying while the format is being tuned.
 * Flip `AD_DEBUG` in `constants/ads.ts` to silence it.
 */
function adLog(event: string, detail?: Record<string, unknown>): void {
  if (!AD_DEBUG) return;
  console.log(`[ads] ${event}`, detail ?? '');
}

/** Shape of the error object the SDK hands to its ERROR listener. */
function describeError(error: unknown): Record<string, unknown> {
  const e = error as { code?: string; message?: string } | undefined;
  return { code: e?.code ?? 'unknown', message: e?.message ?? String(error) };
}

let adsMod: AdsModule | null = null;
let triedRequire = false;

function ads(): AdsModule | null {
  if (Platform.OS === 'web') return null;
  if (!triedRequire) {
    triedRequire = true;
    try {
      // Lazy require (not a static import) so Metro never pulls this native-only
      // module into the web bundle, where it has no build and would throw.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      adsMod = require('react-native-google-mobile-ads') as AdsModule;
    } catch (error) {
      adLog('module:unavailable', describeError(error));
      adsMod = null;
    }
  }
  return adsMod;
}

/**
 * Resolve once the app is genuinely in the foreground.
 *
 * iOS silently drops an App Tracking Transparency request made while the app is
 * anything other than `active` — the prompt simply never appears, which is
 * exactly the "we are unable to locate the ATT permission request" that App
 * Review reports. On a cold launch this JS can run while the process is still
 * `inactive`, so we wait it out rather than fire and hope.
 */
async function whenActive(): Promise<void> {
  if (AppState.currentState === 'active') return;
  await new Promise<void>((resolve) => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      sub.remove();
      resolve();
    });
  });
}

function rewardedUnitId(a: AdsModule): string {
  // Test ad in development or until you paste a real unit id; real ad in prod.
  return __DEV__ || !PROD_REWARDED_UNIT_ID ? a.TestIds.REWARDED : PROD_REWARDED_UNIT_ID;
}

/**
 * A full-screen ad is presented on top of whatever view controller is current,
 * so it must not be asked for while another one is still animating away. Every
 * menu closes a sheet immediately before requesting the ad, and presenting over
 * a modal mid-dismissal fails outright, with the SDK reporting:
 *
 *   The provided view controller is already presenting another view controller.
 *
 * 450 ms proved optimistic on a real device — the JS thread is busy with the
 * screen transition at the same moment — so the budget is deliberately
 * generous. It is only ever paid when an ad is actually about to be shown.
 */
const UI_SETTLE_MS = 700;

let rewarded: Rewarded | null = null;
let rewardedLoaded = false;
let initialized = false;
/** True once `initialize()` has resolved — before that a load cannot succeed. */
let sdkReady = false;
/** True between `load()` and its LOADED/ERROR, so we never stack requests. */
let loadInFlight = false;
/** Resolver for "the ad actually reached the screen". */
let onRewardedOpened: (() => void) | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** When the in-flight load was requested, for timing in the log. */
let loadStartedAt = 0;
/**
 * Game starts so far this session, counted per game. Separate counters keep the
 * cadence honest in a hub: playing three sudokus should show the sudoku ad on
 * the third one whether or not minesweeper was opened in between.
 */
const startCounts = new Map<GameId, number>();
/** Resolver for the in-flight "wait until the ad is dismissed" promise. */
let onRewardedClosed: (() => void) | null = null;
/** Resolver for the in-flight "wait until an ad is ready" promise. */
let onRewardedSettled: (() => void) | null = null;

function settleRewardedClosed(): void {
  const cb = onRewardedClosed;
  onRewardedClosed = null;
  cb?.();
}

/** Wake whoever is waiting for a load to finish — successfully or not. */
function settleRewardedSettled(): void {
  const cb = onRewardedSettled;
  onRewardedSettled = null;
  cb?.();
}

/**
 * How long a game start will wait for an ad that is still loading. A fresh one
 * is requested after every show, so without this the next start almost always
 * arrives too early and the ad is skipped in silence — which looks exactly like
 * "the ads stopped working". The player sees a spinner for this window, so a
 * few seconds are tolerable; beyond that we let them play.
 */
const AD_LOAD_WAIT_MS = 6000;

/** How long we give the OS to actually put the ad on screen after `show()`. */
const AD_PRESENT_WAIT_MS = 2500;

/** Backoff before retrying a load that failed (no fill, no network, …). */
const AD_RETRY_MS = 4000;

/** True once an ad is ready. Waits for the pending load, up to the budget. */
async function rewardedReady(): Promise<boolean> {
  if (rewardedLoaded) return true;
  const a = ads();
  // Nothing in flight — either a previous load died or init only just finished.
  if (a && sdkReady && !loadInFlight) buildAndLoad(a);
  if (!rewarded) return false;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onRewardedSettled = null;
      resolve();
    };
    onRewardedSettled = finish;
    setTimeout(finish, AD_LOAD_WAIT_MS);
  });
  return rewardedLoaded;
}

function buildAndLoad(a: AdsModule): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  rewardedLoaded = false;
  loadInFlight = true;
  loadStartedAt = Date.now();
  // No forced non-personalized flag — AdMob serves personalized ads when the
  // user has consented (via the UMP/ATT flow in initAds) and non-personalized
  // otherwise, automatically.
  const unitId = rewardedUnitId(a);
  adLog('load:request', { unitId, test: unitId === a.TestIds.REWARDED });
  const ad = a.RewardedAd.createForAdRequest(unitId);
  rewarded = ad;
  ad.addAdEventListener(a.RewardedAdEventType.LOADED, () => {
    rewardedLoaded = true;
    loadInFlight = false;
    adLog('load:ok', { ms: Date.now() - loadStartedAt });
    settleRewardedSettled();
  });
  ad.addAdEventListener(a.AdEventType.OPENED, () => {
    adLog('show:opened');
    const cb = onRewardedOpened;
    onRewardedOpened = null;
    cb?.();
  });
  ad.addAdEventListener(a.AdEventType.CLOSED, () => {
    // The user dismissed the ad — let the game proceed, then preload the next.
    adLog('show:closed');
    settleRewardedClosed();
    buildAndLoad(a);
  });
  ad.addAdEventListener(a.AdEventType.ERROR, (error) => {
    rewardedLoaded = false;
    loadInFlight = false;
    // The reason lives here and nowhere else: no-fill, bad unit id, no network.
    adLog('load:error', { ...describeError(error), ms: Date.now() - loadStartedAt });
    // Nobody is going to be woken by a LOADED that will never come.
    settleRewardedSettled();
    settleRewardedClosed();
    // A failure used to be terminal: the dead instance was never replaced, so
    // one no-fill killed ads for the rest of the session. Try again shortly.
    retryTimer = setTimeout(() => {
      retryTimer = null;
      buildAndLoad(a);
    }, AD_RETRY_MS);
  });
  ad.load();
}

/** Initialise the SDK and preload the first rewarded ad. Safe to call once. */
export function initAds(): void {
  const a = ads();
  if (!a || initialized) return;
  initialized = true;
  void (async () => {
    try {
      // App Tracking Transparency first: Apple requires the prompt BEFORE any
      // data that could track the user is collected, and the ads SDK starts
      // doing exactly that once it initialises. `react-native-google-mobile-ads`
      // does not show this prompt — it only speaks Google's UMP — so it has to
      // be requested here explicitly. On Android it resolves granted at once.
      await whenActive();
      const att = await requestTrackingPermissionsAsync();
      adLog('init:att', { status: att.status });
    } catch (error) {
      adLog('init:att-failed', describeError(error));
    }
    try {
      // Then Google's own consent form (GDPR/UMP). It only appears where
      // required and only if consent messages are configured in the AdMob
      // console. Personalized ads are served when both answers allow it.
      const consent = await a.AdsConsent.gatherConsent();
      adLog('init:consent', { status: consent?.status });
    } catch (error) {
      // Consent unavailable — carry on; ads still serve (non-personalized).
      adLog('init:consent-failed', describeError(error));
    }
    try {
      await a.default().initialize();
      sdkReady = true;
      adLog('init:sdk-ready');
      buildAndLoad(a);
    } catch (error) {
      adLog('init:sdk-failed', describeError(error));
      initialized = false;
    }
  })();
}

/**
 * Show the rewarded ad and RESOLVE ONLY once it is dismissed, so the caller can
 * continue after the ad closes. No-op if disabled or nothing is loaded.
 */
export async function maybeShowRewardedAd(adsDisabled: boolean): Promise<void> {
  const a = ads();
  adLog('gate:enter', { adsDisabled, hasModule: Boolean(a), sdkReady, rewardedLoaded });
  if (!a || adsDisabled) {
    adLog('gate:skip', { reason: adsDisabled ? 'ads-disabled' : 'no-module' });
    return;
  }
  // Give the UI its moment first — that doubles as head start for a pending load.
  await new Promise<void>((resolve) => setTimeout(resolve, UI_SETTLE_MS));

  // Only raise the spinner if there is actually something to wait for. Flashing
  // it up and down for an ad that is already in hand is pure churn on the view
  // hierarchy at the worst possible moment — right before presenting the ad.
  const needsWait = !rewardedLoaded;
  if (needsWait) useAdGateStore.getState().setLoading(true);
  let ready = false;
  try {
    ready = await rewardedReady();
  } finally {
    if (needsWait) {
      useAdGateStore.getState().setLoading(false);
      // Let the overlay actually leave the screen before the ad is presented.
      await new Promise<void>((resolve) => setTimeout(resolve, UI_SETTLE_MS));
    }
  }
  if (!ready) {
    adLog('gate:skip', { reason: 'not-loaded-in-time' });
    return;
  }

  // Re-read: a finished load may have swapped the instance while we waited.
  const ad = rewarded;
  if (!ad) {
    adLog('gate:skip', { reason: 'no-instance' });
    return;
  }
  adLog('show:call');

  // `show()` can resolve without anything reaching the screen — a stale ad, a
  // busy view controller. OPENED is the only honest confirmation, so if it does
  // not arrive we stop waiting on CLOSED (which will never come either) and
  // rebuild, rather than holding the game behind an ad nobody can see.
  const presented = new Promise<boolean>((resolve) => {
    let done = false;
    const settle = (ok: boolean) => {
      if (done) return;
      done = true;
      onRewardedOpened = null;
      resolve(ok);
    };
    onRewardedOpened = () => settle(true);
    setTimeout(() => settle(false), AD_PRESENT_WAIT_MS);
  });

  const closed = new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onRewardedClosed = null;
      resolve();
    };
    onRewardedClosed = finish; // called by the CLOSED / ERROR listeners
    setTimeout(finish, 30000); // safety net — never block the game indefinitely
    ad.show().catch((error) => {
      adLog('show:rejected', describeError(error));
      buildAndLoad(a);
      finish();
    });
  });

  if (!(await presented)) {
    adLog('show:never-appeared');
    // Never made it to the screen; drop this instance and fetch a fresh one.
    rewardedLoaded = false;
    buildAndLoad(a);
    return;
  }
  await closed;
  adLog('gate:done');
}

/**
 * Game-start rewarded ad: shown on every REWARDED_START_EVERY_N-th start of that
 * particular game. The counter advances on every call so the cadence is by
 * start, not by availability.
 */
export async function maybeShowStartRewardedAd(
  game: GameId,
  adsDisabled: boolean,
): Promise<void> {
  const startCount = (startCounts.get(game) ?? 0) + 1;
  startCounts.set(game, startCount);
  const everyN = REWARDED_START_EVERY_N[game];
  const willShow = startCount % everyN === 0;
  adLog('gate:game-start', { game, startCount, everyN, willShow });
  if (!willShow) return;
  await maybeShowRewardedAd(adsDisabled);
}
