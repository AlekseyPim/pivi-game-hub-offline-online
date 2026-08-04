import * as NativeSplash from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { ACCENT } from '@/shared/constants/colors';
import { useT } from '@/shared/i18n/useT';

// TODO: replace with the hub's own artwork — this is still the Expo template's
// splash mark, and it also feeds `expo-splash-screen` in app.json.
const LOGO = require('../../../assets/images/splash-icon.png');

/**
 * Fixed brand background, matching `backgroundColor` of the native splash in
 * app.json — the launch screen is not a themed app screen, and keeping the two
 * identical means no colour flash when the native splash hands over to this one.
 */
const SPLASH_BG = '#12141A';

// The branded splash stays up at least this long, even with nothing to load.
const MIN_SPLASH_MS = 1400;

// Keep the OS splash up until our JS splash has rendered (no white flash).
void NativeSplash.preventAutoHideAsync().catch(() => {});

/**
 * Branded splash on launch: shows the hub mark while a minimum time passes and
 * the OTA update check runs. If an update is published it's downloaded (with a
 * visible "downloading" line) and the app reloads into it; otherwise the app is
 * revealed. In dev / Expo Go the update step is skipped.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [otaDone, setOtaDone] = useState(__DEV__ || !Updates.isEnabled);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Our JS splash is up now — hand off from the OS splash.
    void NativeSplash.hideAsync().catch(() => {});
    const id = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled) return;
        if (check.isAvailable) {
          setDownloading(true);
          await Updates.fetchUpdateAsync();
          if (cancelled) return;
          await Updates.reloadAsync();
          return; // app restarts into the new bundle
        }
      } catch {
        // Offline or no update — fall through to the embedded bundle.
      }
      if (!cancelled) setOtaDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (minElapsed && otaDone) return <>{children}</>;
  return <Splash downloading={downloading} />;
}

function Splash({ downloading }: { downloading: boolean }) {
  const t = useT();
  return (
    <View style={styles.screen}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={styles.wordmark}>{t('app_title')}</Text>
      <ActivityIndicator size="small" color={ACCENT} style={styles.spinner} />
      {downloading && <Text style={styles.status}>{t('downloading_update')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: SPLASH_BG,
  },
  logo: { width: 180, height: 180 },
  wordmark: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  spinner: { marginTop: 8 },
  status: { fontSize: 14, fontWeight: '600', color: '#E0E0E0' },
});
