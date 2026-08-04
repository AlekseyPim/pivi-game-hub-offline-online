import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageButton } from '@/shared/components/LanguageModal';
import { RestorePurchasesButton } from '@/shared/components/RestorePurchasesButton';
import { ACCENT } from '@/shared/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { copyToClipboard } from '@/shared/logic/clipboard';
import { useRoomStore } from '@/shared/store/roomStore';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * The hub's one settings screen. Everything on it is app-wide — theme, language,
 * haptics, the remembered online name, purchases — so no game ships a second
 * copy.
 *
 * A game that has a preference of its own (minesweeper's board palette, ludo's
 * fast mode) mounts this screen from its own `/settings` route and passes that
 * block as `children`; it lands under the shared rows, above the terms link.
 */
export function SettingsScreen({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const darkMode = useSettingsStore((s) => s.darkMode);
  const toggleDarkMode = useSettingsStore((s) => s.toggleDarkMode);
  const haptics = useSettingsStore((s) => s.haptics);
  const setHaptics = useSettingsStore((s) => s.setHaptics);

  // While a room is open the code is otherwise only visible in the lobby, which
  // you have already left once the match starts — so surface it here, where the
  // pause menu of whichever game owns the room can reach it mid-match.
  const roomCode = useRoomStore((s) => s.code);
  const inRoom = roomCode != null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {inRoom ? (
          <Pressable
            style={[styles.card, styles.roomRow, { backgroundColor: theme.card }]}
            onPress={() => copyToClipboard(roomCode, t('code_copied'))}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                {t('room_code')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
                {t('room_code_hint')}
              </Text>
            </View>
            <Text style={[styles.roomCode, { color: theme.textPrimary }]}>
              {roomCode}
            </Text>
          </Pressable>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              {t('dark_mode')}
            </Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ true: ACCENT }} />
          </View>
          <View style={[styles.row, styles.rowDivider, { borderTopColor: theme.background }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('haptics')}</Text>
              <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
                {t('haptics_hint')}
              </Text>
            </View>
            <Switch value={haptics} onValueChange={setHaptics} trackColor={{ true: ACCENT }} />
          </View>
          <View style={[styles.row, styles.rowDivider, { borderTopColor: theme.background }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('language')}</Text>
            <LanguageButton />
          </View>
        </View>

        {children}

        <Pressable
          style={[styles.card, styles.agreementRow, { backgroundColor: theme.card }]}
          onPress={() => router.push('/agreement')}
        >
          <View style={styles.agreementText}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('agreement')}</Text>
            <Text style={[styles.agreementHint, { color: theme.textSecondary }]}>
              {t('agreement_hint')}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </Pressable>

        <RestorePurchasesButton />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 26, fontWeight: '800' },
  scroll: { gap: 16, paddingBottom: 24 },
  card: { borderRadius: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowDivider: { borderTopWidth: 1 },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  roomCode: { fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  rowText: { flex: 1, gap: 2, paddingRight: 12 },
  rowLabel: { fontSize: 17, fontWeight: '700' },
  rowHint: { fontSize: 13, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: -6 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchShip: { position: 'absolute', left: 6, bottom: 8, width: 26, height: 8, borderRadius: 3 },
  swatchCheck: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  agreementText: { flex: 1, gap: 2 },
  agreementHint: { fontSize: 13, fontWeight: '600' },
  chevron: { fontSize: 26, fontWeight: '700' },
});
