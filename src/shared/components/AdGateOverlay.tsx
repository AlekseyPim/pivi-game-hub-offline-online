import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { useAdGateStore } from '@/shared/store/adGateStore';

/**
 * Global "fetching an ad" overlay, mounted once above every screen.
 *
 * Without it the seconds spent waiting for an ad read as a frozen app — the
 * player taps Start and nothing happens.
 *
 * It is deliberately a plain absolutely-positioned view and NOT a `Modal`. On
 * iOS a `Modal` is a real view controller, and presenting a full-screen ad while
 * one is still being dismissed fails outright with "The provided view controller
 * is already presenting another view controller" — which is exactly how this
 * overlay silently killed the very ads it was meant to explain. A plain view
 * belongs to the existing controller, so it can never compete with the ad.
 *
 * Safe because the gate always lowers the overlay before calling `show()`: the
 * ad is never covered by it.
 */
export function AdGateOverlay() {
  const loading = useAdGateStore((s) => s.loading);
  const theme = useTheme();
  const t = useT();

  if (!loading) return null;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={[styles.label, { color: theme.textPrimary }]}>
          {t('loading_ad')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
  },
  label: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
