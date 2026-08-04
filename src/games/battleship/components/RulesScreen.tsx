import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCENT } from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { useT } from '@/games/battleship/i18n/useT';

const RULE_KEYS = [
  'rule_fleet',
  'rule_touch',
  'rule_shoot',
  'rule_sunk',
  'rule_win',
  'rule_move_mode',
  'rule_move_blocked',
  'rule_move_stale',
  'rule_online',
];

export function RulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('rules')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: theme.textPrimary }]}>{t('rules_intro')}</Text>
        {RULE_KEYS.map((key) => (
          <View key={key} style={styles.ruleRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={[styles.ruleText, { color: theme.textSecondary }]}>{t(key)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 26, fontWeight: '800' },
  content: { gap: 14, paddingVertical: 8, paddingBottom: 24 },
  intro: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  ruleRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 16, color: ACCENT, fontWeight: '900' },
  ruleText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
