import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/games/ludo/i18n/useT';
import { usePrefsStore } from '@/games/ludo/store/prefsStore';

/**
 * Ludo's own corner of the settings screen: fast mode, and the way into the
 * saved player names. Mounted into the shared settings screen from ludo's
 * `/settings` route — everything else on that screen is app-wide.
 */
export function GameSettings() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const fastMode = usePrefsStore((s) => s.fastMode);
  const setFastMode = usePrefsStore((s) => s.setFastMode);

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('fast_mode')}
            </Text>
            <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
              {t('fast_mode_hint')}
            </Text>
          </View>
          <Switch
            value={fastMode}
            onValueChange={setFastMode}
            trackColor={{ true: '#1E88E5' }}
          />
        </View>
      </View>

      <Pressable
        style={[styles.card, styles.linkRow, { backgroundColor: theme.card }]}
        onPress={() => router.push('/ludo/names')}
      >
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('names')}</Text>
          <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
            {t('names_hint')}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowText: { flex: 1, gap: 2, paddingRight: 12 },
  rowLabel: { fontSize: 17, fontWeight: '700' },
  rowHint: { fontSize: 13, fontWeight: '600' },
  chevron: { fontSize: 26, fontWeight: '700' },
});
