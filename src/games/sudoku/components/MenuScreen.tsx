import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { maybeShowStartRewardedAd } from "@/shared/ads/adService";
import { useAdsDisabled } from "@/shared/ads/useAdsDisabled";
import { AdBanner } from "@/shared/components/AdBanner";
import { CoffeeButton } from "@/shared/components/CoffeeButton";
import { HubBackButton } from '@/shared/components/HubBackButton';
import { LanguageButton } from "@/shared/components/LanguageModal";
import { UnlockCodeModal } from "@/shared/components/UnlockCodeModal";
import {
  SECRET_TAP_COUNT,
  SECRET_TAP_WINDOW_MS,
  SHOW_MENU_BANNER,
} from "@/shared/constants/ads";
import { GAME_ID } from "@/games/sudoku/constants/app";
import { DIFFICULTIES } from "@/games/sudoku/constants/board";
import { ACCENT } from "@/games/sudoku/constants/colors";
import { useTheme } from "@/games/sudoku/constants/theme";
import { useT } from "@/games/sudoku/i18n/useT";
import { useGameStore } from "@/games/sudoku/store/gameStore";
import { useSaveStore } from "@/games/sudoku/store/saveStore";
import { useSettingsStore } from "@/shared/store/settingsStore";
import { useSetupStore } from "@/games/sudoku/store/setupStore";

// Build identity, shown in the footer (mirrors ludo-game). The OTA id is null
// on a plain build (no update applied) → we show the localized "embedded".
const APP_VERSION = Constants.expoConfig?.version ?? "—";
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  "—";
const OTA_SHORT_ID = Updates.updateId ? Updates.updateId.slice(0, 8) : null;

/** Home screen — same items and running order as ludo-game's menu. */
export function MenuScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const difficulty = useSetupStore((s) => s.difficulty);
  const setDifficulty = useSetupStore((s) => s.setDifficulty);
  const playerName = useSettingsStore((s) => s.onlineName);

  const hasSave = useSaveStore((s) => s.hasSave);
  const loadSave = useSaveStore((s) => s.load);
  const clearSave = useSaveStore((s) => s.clear);
  const adsDisabled = useAdsDisabled();

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Hidden "remove ads" gate: tap the logo SECRET_TAP_COUNT times in a row
  // (each within SECRET_TAP_WINDOW_MS of the last) to open the code prompt.
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

  // A rewarded ad plays on every Nth start (no-op for supporters / ad-free)
  // before we drop into the fleet arrangement.
  const start = async () => {
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    useGameStore.getState().startLocal(difficulty, playerName);
    router.push('/sudoku/game');
  };

  // Resume the saved game, consuming the slot (save again from the pause menu).
  const load = () => {
    void loadSave().then(async (saved) => {
      if (!saved) return;
      useGameStore.getState().loadSavedGame(saved);
      await clearSave();
      router.push('/sudoku/game');
    });
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <HubBackButton />
      <ScrollView
        contentContainerStyle={styles.setup}
        showsVerticalScrollIndicator={false}
      >
        {/* The logo carries the name — no separate caption needed. */}
        <Pressable onPress={onLogoTap} hitSlop={8} accessibilityLabel={t("app_title")}>
          <Image
            source={require("../../../../assets/games/sudoku/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Pressable>

        <AdBanner enabled={SHOW_MENU_BANNER} />

        <Text style={[styles.setupLabel, { color: theme.textSecondary }]}>
          {t("difficulty")}
        </Text>
        <View style={styles.modeRow}>
          {DIFFICULTIES.map((value) => {
            const active = difficulty === value;
            return (
              <Pressable
                key={value}
                onPress={() => setDifficulty(value)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: active ? ACCENT : "transparent",
                    opacity: active ? 1 : 0.65,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.modeName, { color: theme.textPrimary }]}
                >
                  {t(value)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.modeHint, { color: theme.textSecondary }]}>
          {t(`${difficulty}_hint`)}
        </Text>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, styles.rowButton]}
            onPress={start}
          >
            <Text
              style={styles.primaryButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t("start_game")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, styles.rowButton]}
            onPress={() => router.push('/sudoku/online')}
          >
            <Text
              style={styles.primaryButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t("online_play")}
            </Text>
          </Pressable>
        </View>

        {hasSave ? (
          <Pressable
            style={[styles.secondaryButton, styles.wideButton]}
            onPress={load}
          >
            <Text style={styles.secondaryButtonText}>📂 {t("load_game")}</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.secondaryButton, styles.wideButton]}
          onPress={() => router.push('/sudoku/rules')}
        >
          <Text style={styles.secondaryButtonText}>📖 {t("rules")}</Text>
        </Pressable>

        <View style={styles.settingsRow}>
          <Pressable
            style={[styles.secondaryButton, styles.settingsButton]}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.secondaryButtonText}>⚙️ {t("settings")}</Text>
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
              {t("supporter_info_link")}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/agreement")} hitSlop={6}>
          <Text style={styles.agreementLink}>{t("agreement_link")}</Text>
        </Pressable>
      </ScrollView>

      <UnlockCodeModal
        visible={unlockOpen}
        onClose={() => setUnlockOpen(false)}
      />

      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInfoOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t("supporter_info_title")}
            </Text>
            <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
              {t("supporter_info_body")}
            </Text>
            <Text style={[styles.infoRestore, { color: theme.textPrimary }]}>
              {t("supporter_info_restore")}
            </Text>
            <Pressable
              style={styles.infoClose}
              onPress={() => setInfoOpen(false)}
            >
              <Text style={styles.infoCloseText}>{t("close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={[styles.buildInfo, { color: theme.textSecondary }]}>
        v{APP_VERSION} ({BUILD_NUMBER}) · OTA {OTA_SHORT_ID ?? t("embedded")}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  setup: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
    paddingBottom: 48,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  logoImage: { width: 168, height: 168, borderRadius: 30, alignSelf: "center" },
  setupLabel: { marginTop: 6, fontSize: 15, fontWeight: "600" },
  modeRow: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
    maxWidth: 360,
  },
  modeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 2.5,
  },
  modeName: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  modeHint: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 17,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  countNumber: { fontSize: 20, fontWeight: "900", color: ACCENT },
  countLabel: { fontSize: 13, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 360,
    marginTop: 6,
  },
  rowButton: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  wideButton: { width: "100%", maxWidth: 360, alignItems: "center" },
  settingsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 360,
    alignItems: "stretch",
  },
  settingsButton: { flex: 1, alignItems: "center" },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  secondaryButtonText: { color: ACCENT, fontSize: 16, fontWeight: "700" },
  coffeeWrap: { width: "100%", maxWidth: 360, gap: 8 },
  infoLinkWrap: { alignSelf: "center", paddingVertical: 4 },
  infoLink: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  agreementLink: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT,
    textDecorationLine: "underline",
    textAlign: "center",
    maxWidth: 320,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "900" },
  infoBody: { fontSize: 15, lineHeight: 21 },
  infoRestore: { fontSize: 13, fontWeight: "700" },
  infoClose: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  infoCloseText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  buildInfo: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
});
