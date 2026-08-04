import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/shared/components/AdBanner';
import { CoffeeButton } from '@/shared/components/CoffeeButton';
import { LanguageButton } from '@/shared/components/LanguageModal';
import { UnlockCodeModal } from '@/shared/components/UnlockCodeModal';
import {
  SECRET_TAP_COUNT,
  SECRET_TAP_WINDOW_MS,
  SHOW_HUB_BANNER,
} from '@/shared/constants/ads';
import { ACCENT } from '@/shared/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { GAMES, type GameCard } from '@/shared/games/registry';
import { useT } from '@/shared/i18n/useT';

// Build identity, shown in the footer (same line the four standalone apps had).
// The OTA id is null on a plain build → we show the localized "embedded".
const APP_VERSION = Constants.expoConfig?.version ?? '—';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  '—';
const OTA_SHORT_ID = Updates.updateId ? Updates.updateId.slice(0, 8) : null;

/**
 * The front page: one card per game, then the things that belong to the app
 * rather than to any single game — settings, language, the coffee button, the
 * terms link.
 *
 * The hidden ad-free gate lives on the title here (five quick taps), not on a
 * game's logo, because there is now one code for the whole hub.
 */
export function HubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const [unlockOpen, setUnlockOpen] = useState(false);

  const tapCount = useRef(0);
  const lastTap = useRef(0);
  const onTitleTap = () => {
    const now = Date.now();
    if (now - lastTap.current > SECRET_TAP_WINDOW_MS) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= SECRET_TAP_COUNT) {
      tapCount.current = 0;
      setUnlockOpen(true);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onTitleTap} hitSlop={8}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('app_title')}
          </Text>
        </Pressable>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('hub_pick_game')}
        </Text>

        <View style={styles.list}>
          {GAMES.map((game) => (
            <GameRow key={game.id} game={game} />
          ))}
        </View>

        <AdBanner enabled={SHOW_HUB_BANNER} />

        <View style={styles.settingsRow}>
          <Pressable
            style={[styles.secondaryButton, styles.settingsButton]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.secondaryButtonText}>⚙️ {t('settings')}</Text>
          </Pressable>
          <LanguageButton />
        </View>

        <CoffeeButton />

        <Pressable onPress={() => router.push('/agreement')} hitSlop={6}>
          <Text style={styles.agreementLink}>{t('agreement_link')}</Text>
        </Pressable>

        <Text style={[styles.buildInfo, { color: theme.textSecondary }]}>
          v{APP_VERSION} ({BUILD_NUMBER}) · OTA {OTA_SHORT_ID ?? t('embedded')}
        </Text>
      </ScrollView>

      <UnlockCodeModal visible={unlockOpen} onClose={() => setUnlockOpen(false)} />
    </SafeAreaView>
  );
}

function GameRow({ game }: { game: GameCard }) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const ready = game.route != null;

  return (
    <Pressable
      disabled={!ready}
      onPress={() => {
        if (game.route) router.push(game.route);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: game.accent,
          opacity: ready ? (pressed ? 0.8 : 1) : 0.45,
        },
      ]}
    >
      <Image source={game.logo} style={styles.cardLogo} resizeMode="contain" />
      <View style={styles.cardText}>
        <Text style={[styles.cardName, { color: theme.textPrimary }]} numberOfLines={1}>
          {t(game.nameKey)}
        </Text>
        <Text style={[styles.cardTagline, { color: theme.textSecondary }]} numberOfLines={2}>
          {t(game.taglineKey)}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: game.accent }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingBottom: 40,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: -8 },
  list: { gap: 12, marginTop: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  cardLogo: { width: 64, height: 64, borderRadius: 14 },
  cardText: { flex: 1, gap: 3 },
  cardName: { fontSize: 19, fontWeight: '800' },
  cardTagline: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  chevron: { fontSize: 30, fontWeight: '800' },
  settingsRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch', marginTop: 4 },
  settingsButton: { flex: 1, alignItems: 'center' },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  secondaryButtonText: { color: ACCENT, fontSize: 16, fontWeight: '700' },
  agreementLink: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 4,
  },
  buildInfo: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 8 },
});
