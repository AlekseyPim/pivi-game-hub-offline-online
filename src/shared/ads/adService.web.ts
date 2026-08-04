import type { GameId } from '@/shared/games/ids';

/**
 * Web stub for the ad service. There are no native ads on web, and the
 * `react-native-google-mobile-ads` package imports react-native internals that
 * can't be bundled for web — so Metro picks this `.web` variant on the web
 * platform, keeping that native-only module out of the web graph entirely.
 *
 * Exposes the exact same API as `adService.ts`, all no-ops.
 */

export function initAds(): void {}

export async function maybeShowRewardedAd(adsDisabled: boolean): Promise<void> {
  void adsDisabled;
}

export async function maybeShowStartRewardedAd(
  game: GameId,
  adsDisabled: boolean,
): Promise<void> {
  void game;
  void adsDisabled;
}
