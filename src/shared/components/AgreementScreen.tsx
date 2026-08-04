import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/constants/theme';
import { useAgreement } from '@/shared/i18n/useT';

/** Full terms-of-use text (reached from the menu link and Settings). */
export function AgreementScreen() {
  const router = useRouter();
  const theme = useTheme();
  const agreement = useAgreement();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{agreement.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{agreement.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, fontWeight: '700', lineHeight: 36 },
  title: { flex: 1, fontSize: 24, fontWeight: '800' },
  scroll: { paddingBottom: 24 },
  body: { fontSize: 15, lineHeight: 22 },
});
