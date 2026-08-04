import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { useSupporterStore } from '@/shared/store/supporterStore';

/** Cups drawn in the counter — capped so a generous tipper doesn't overflow. */
const MAX_CUPS = 12;

/** Warm "thank you" screen shown right after a coffee is bought. */
export function ThanksScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const coffeeCount = useSupporterStore((s) => s.coffeeCount);

  const cups = '☕'.repeat(Math.min(Math.max(coffeeCount, 1), MAX_CUPS));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={styles.bigCup}>☕</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('coffee_thanks_title')}
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {t('coffee_thanks_body')}
        </Text>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={styles.cups}>{cups}</Text>
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            {t('coffee_count', { n: coffeeCount })}
          </Text>
        </View>
      </View>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>{t('coffee_thanks_close')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 28 },
  content: { alignItems: 'center', gap: 12 },
  bigCup: { fontSize: 96 },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center', maxWidth: 320, lineHeight: 22 },
  card: {
    marginTop: 12,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
  },
  cups: { fontSize: 26, textAlign: 'center' },
  count: { fontSize: 15, fontWeight: '700' },
  button: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderRadius: 14,
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
