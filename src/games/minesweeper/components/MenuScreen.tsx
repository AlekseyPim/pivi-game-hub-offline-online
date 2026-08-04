import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maybeShowStartRewardedAd } from '@/shared/ads/adService';
import { GAME_ID } from '@/games/minesweeper/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { AdBanner } from '@/shared/components/AdBanner';
import { CoffeeButton } from '@/shared/components/CoffeeButton';
import { HubBackButton } from '@/shared/components/HubBackButton';
import { LanguageButton } from '@/shared/components/LanguageModal';
import { SetupModal } from '@/games/minesweeper/components/SetupModal';
import { UnlockCodeModal } from '@/shared/components/UnlockCodeModal';
import {
  SECRET_TAP_COUNT,
  SECRET_TAP_WINDOW_MS,
  SHOW_MENU_BANNER,
} from '@/shared/constants/ads';
import { minesForSize } from '@/games/minesweeper/constants/board';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import { useGameStore } from '@/games/minesweeper/store/gameStore';
import { useSaveStore } from '@/games/minesweeper/store/saveStore';
import { useSetupStore } from '@/games/minesweeper/store/setupStore';

// Build identity, shown in the footer (mirrors ludo-game). OTA id is null on a
// plain build (no update applied) → we show the localized "embedded" instead.
const APP_VERSION = Constants.expoConfig?.version ?? '—';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  '—';
const OTA_SHORT_ID = Updates.updateId ? Updates.updateId.slice(0, 8) : null;

/** Home screen: pick "Play" or "Play online" — each opens the setup sheet first. */
export function MenuScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const startLocal = useGameStore((s) => s.startLocal);
  const loadIntoGame = useGameStore((s) => s.loadGame);

  const hasSave = useSaveStore((s) => s.hasSave);
  const loadSave = useSaveStore((s) => s.load);
  const clearSave = useSaveStore((s) => s.clear);
  const adsDisabled = useAdsDisabled();

  // Which entry point the setup sheet is currently gating (null = closed).
  const [setupFor, setSetupFor] = useState<null | 'local' | 'online'>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Secret "remove ads" gate: SECRET_TAP_COUNT quick taps on the logo open it.
  const tapCount = useRef(0);
  const lastTap = useRef(0);
  const onLogoTap = () => {
    const now = Date.now();
    if (now - lastTap.current > SECRET_TAP_WINDOW_MS) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= SECRET_TAP_COUNT) {
      tapCount.current = 0;
      setUnlockOpen(true);
    }
  };

  // Resume the saved game, consuming the slot (save again from the pause menu).
  const cont = async () => {
    const saved = await loadSave();
    if (!saved) return;
    loadIntoGame(saved);
    await clearSave();
    router.push('/minesweeper/game');
  };

  // Confirm from the setup sheet: start the chosen flow with the current config.
  // A local start shows the rewarded ad on every 3rd game; the ad — if any —
  // plays before we enter the board.
  const confirmSetup = async () => {
    const target = setupFor;
    setSetupFor(null);
    if (target === 'local') {
      const { size, difficulty, mineDensity } = useSetupStore.getState();
      startLocal({
        size,
        mines: minesForSize(size, mineDensity),
        difficulty,
        turnMode: 'parallel',
        players: [{ name: '' }],
      });
      await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
      router.push('/minesweeper/game');
    } else if (target === 'online') {
      router.push('/minesweeper/online');
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <HubBackButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={onLogoTap} hitSlop={8}>
          <Image
            source={require('../../../../assets/games/minesweeper/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('app_title')}
        </Text>

        {hasSave ? (
          <Pressable style={styles.secondaryButton} onPress={cont}>
            <Text style={styles.secondaryButtonText}>⏯  {t('continue_game')}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={() => setSetupFor('local')}>
          <Text style={styles.primaryButtonText}>▶  {t('play')}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => setSetupFor('online')}>
          <Text style={styles.secondaryButtonText}>🌐  {t('online_play')}</Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Pressable
            style={[styles.smallButton, { borderColor: theme.textSecondary }]}
            onPress={() => router.push('/minesweeper/rules')}
          >
            <Text style={[styles.smallButtonText, { color: theme.textPrimary }]}>
              📖  {t('rules')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.smallButton, { borderColor: theme.textSecondary }]}
            onPress={() => router.push('/minesweeper/settings')}
          >
            <Text style={[styles.smallButtonText, { color: theme.textPrimary }]}>
              ⚙️  {t('settings')}
            </Text>
          </Pressable>
          <LanguageButton />
        </View>

        <View style={styles.coffeeWrap}>
          <CoffeeButton />
          <Pressable
            onPress={() => setInfoOpen(true)}
            hitSlop={6}
            style={styles.infoLinkWrap}
          >
            <Text style={[styles.infoLink, { color: theme.textSecondary }]}>
              {t('supporter_info_link')}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/agreement')} hitSlop={6}>
          <Text style={styles.agreementLink}>{t('agreement_link')}</Text>
        </Pressable>

        <Text style={[styles.version, { color: theme.textSecondary }]}>
          v{APP_VERSION} ({BUILD_NUMBER}) · OTA {OTA_SHORT_ID ?? t('embedded')}
        </Text>
      </ScrollView>

      <AdBanner enabled={SHOW_MENU_BANNER} />

      <SetupModal
        visible={setupFor != null}
        confirmLabel={setupFor === 'online' ? t('online_play') : t('play')}
        onConfirm={confirmSetup}
        onClose={() => setSetupFor(null)}
      />

      <UnlockCodeModal visible={unlockOpen} onClose={() => setUnlockOpen(false)} />

      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t('supporter_info_title')}
            </Text>
            <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
              {t('supporter_info_body')}
            </Text>
            <Text style={[styles.infoRestore, { color: theme.textPrimary }]}>
              {t('supporter_info_restore')}
            </Text>
            <Pressable style={styles.infoClose} onPress={() => setInfoOpen(false)}>
              <Text style={styles.infoCloseText}>{t('close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  logo: { width: 230, height: 192 },
  title: { fontSize: 34, fontWeight: '900', marginBottom: 4 },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1E88E5',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1E88E5', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  smallButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  smallButtonText: { fontSize: 15, fontWeight: '700' },
  agreementLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E88E5',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 4,
  },
  version: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  coffeeWrap: { alignSelf: 'stretch', gap: 8 },
  infoLinkWrap: { alignSelf: 'center', paddingVertical: 4 },
  infoLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: { width: '100%', maxWidth: 340, borderRadius: 18, padding: 20, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  infoBody: { fontSize: 15, lineHeight: 21 },
  infoRestore: { fontSize: 13, fontWeight: '700' },
  infoClose: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  infoCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

