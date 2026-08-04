import { Platform, StyleSheet, View } from 'react-native';

import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { PROD_BANNER_UNIT_ID } from '@/shared/constants/ads';

/**
 * Adaptive AdMob banner (ported from ludo-game). Renders nothing when ads are
 * disabled (unlock code), on web, or if the native module is unavailable — so
 * every call site can drop it in unconditionally.
 *
 * `enabled` lets a placement be killed by a `SHOW_*_BANNER` feature flag from
 * `constants/ads.ts` without touching the call site's JSX. The web bundle uses
 * the `.web` stub, so this native-only module never enters the web graph.
 */

type AdsModule = typeof import('react-native-google-mobile-ads');

let adsMod: AdsModule | null = null;
let triedRequire = false;

function ads(): AdsModule | null {
  if (Platform.OS === 'web') return null;
  if (!triedRequire) {
    triedRequire = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      adsMod = require('react-native-google-mobile-ads') as AdsModule;
    } catch {
      adsMod = null;
    }
  }
  return adsMod;
}

interface AdBannerProps {
  /** Feature-flag gate; pass a `SHOW_*_BANNER` constant. Defaults to true. */
  enabled?: boolean;
}

export function AdBanner({ enabled = true }: AdBannerProps) {
  const adsDisabled = useAdsDisabled();
  const a = ads();
  if (!enabled || adsDisabled || !a) return null;

  const unitId =
    __DEV__ || !PROD_BANNER_UNIT_ID ? a.TestIds.BANNER : PROD_BANNER_UNIT_ID;
  const { BannerAd, BannerAdSize } = a;

  return (
    <View style={styles.wrap}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
