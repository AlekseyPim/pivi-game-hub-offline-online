import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/constants/theme';
import { useRules, useT } from '@/games/ludo/i18n/useT';

export function RulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const rules = useRules();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('rules')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {rules.map((rule) => (
          <View key={rule.title} style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.ruleTitle, { color: theme.textPrimary }]}>
              {rule.title}
            </Text>
            <Text style={[styles.ruleText, { color: theme.textSecondary }]}>
              {rule.text}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  scroll: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
