import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
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

import { useAdsDisabled } from "@/shared/ads/useAdsDisabled";
import { maybeShowStartRewardedAd } from "@/shared/ads/adService";
import { GAME_ID } from '@/games/ludo/constants/app';
import { AdBanner } from "@/shared/components/AdBanner";
import { CoffeeButton } from "@/shared/components/CoffeeButton";
import { HubBackButton } from '@/shared/components/HubBackButton';
import { StartGameModal } from "@/games/ludo/components/StartGameModal";
import { UnlockCodeModal } from "@/shared/components/UnlockCodeModal";
import {
  SECRET_TAP_COUNT,
  SECRET_TAP_WINDOW_MS,
  SHOW_MENU_BANNER,
} from "@/shared/constants/ads";
import { COLOR_ORDER } from "@/games/ludo/constants/board";
import { COLOR_HEX } from "@/games/ludo/constants/colors";
import { useTheme } from "@/shared/constants/theme";
import { LANGUAGES, type Language } from "@/games/ludo/i18n/translations";
import { useT } from "@/games/ludo/i18n/useT";
import { hasSavedGame, loadGame } from "@/games/ludo/logic/persistence";
import { useGameStore } from "@/games/ludo/store/gameStore";
import { useSettingsStore } from "@/shared/store/settingsStore";
import { useSetupStore } from "@/games/ludo/store/setupStore";
import type { PlayerConfig } from "@/games/ludo/types/game";

const APP_VERSION = Constants.expoConfig?.version ?? "—";
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  "—";
const OTA_SHORT_ID = Updates.updateId ? Updates.updateId.slice(0, 8) : null;

const LANGUAGE_FLAGS: Record<Language, string> = {
  ru: "🇷🇺",
  en: "🇬🇧",
  de: "🇩🇪",
  es: "🇪🇸",
  uk: "🇺🇦",
  pl: "🇵🇱",
  sk: "🇸🇰",
};
const LANGUAGE_LABELS: Record<Language, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  es: "Español",
  uk: "Українська",
  pl: "Polski",
  sk: "Slovenčina",
};

export function MenuScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const startGame = useGameStore((s) => s.startGame);
  const loadSavedGame = useGameStore((s) => s.loadSavedGame);
  const adsDisabled = useAdsDisabled();

  const colors = useSetupStore((s) => s.colors);
  const names = useSetupStore((s) => s.names);
  const types = useSetupStore((s) => s.types);
  const toggleColor = useSetupStore((s) => s.toggleColor);
  const setName = useSetupStore((s) => s.setName);
  const togglePlayerType = useSetupStore((s) => s.togglePlayerType);

  const [canLoad, setCanLoad] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  // Hidden "remove ads" gate: tap the logo SECRET_TAP_COUNT times in a row
  // (each within SECRET_TAP_WINDOW_MS of the last) to open the code prompt.
  const tapCount = useRef(0);
  const lastTapAt = useRef(0);
  const onLogoPress = () => {
    const now = Date.now();
    tapCount.current =
      now - lastTapAt.current > SECRET_TAP_WINDOW_MS ? 1 : tapCount.current + 1;
    lastTapAt.current = now;
    if (tapCount.current >= SECRET_TAP_COUNT) {
      tapCount.current = 0;
      setUnlockOpen(true);
    }
  };

  useEffect(() => {
    let active = true;
    void hasSavedGame().then((exists) => {
      if (active) setCanLoad(exists);
    });
    return () => {
      active = false;
    };
  }, []);

  const start = async () => {
    const config: PlayerConfig[] = colors.map((color) => ({
      color,
      type: types[color],
      name: names[color]?.trim() || t(`color_${color}`),
    }));
    setConfirmOpen(false);
    // Rewarded ad at every game start (no-op for ad-free / when nothing is
    // loaded) before dropping into the board.
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    startGame(config);
    router.push('/ludo/game');
  };

  const load = () => {
    void loadGame().then((saved) => {
      if (saved) {
        loadSavedGame(saved);
        router.push('/ludo/game');
      }
    });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <HubBackButton />
      <ScrollView
        contentContainerStyle={styles.setup}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onLogoPress}>
          <Image
            source={require("../../../../assets/games/ludo/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Pressable>

        <AdBanner enabled={SHOW_MENU_BANNER} />

        <Text style={[styles.setupLabel, { color: theme.textSecondary }]}>
          {t("choose_colors")}
        </Text>
        <View style={styles.colorRow}>
          {COLOR_ORDER.map((color) => {
            const selected = colors.includes(color);
            const isBot = types[color] === "bot";
            return (
              <View key={color} style={styles.colorCol}>
                <Pressable
                  onPress={() => toggleColor(color)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: COLOR_HEX[color],
                      opacity: selected ? 1 : 0.3,
                      borderColor: selected ? theme.textPrimary : "transparent",
                    },
                  ]}
                >
                  {selected && <Text style={styles.colorCheck}>✓</Text>}
                </Pressable>
                {selected ? (
                  <Pressable
                    onPress={() => togglePlayerType(color)}
                    style={[styles.typeToggle, { borderColor: COLOR_HEX[color] }]}
                  >
                    <Text style={styles.typeIcon}>{isBot ? "🤖" : "👤"}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.typeSpacer} />
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.countPill, { backgroundColor: theme.card }]}>
          <Text style={styles.countNumber}>{colors.length}</Text>
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
            {t("players_in_game")}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryButton, styles.rowButton]}
            onPress={() => setConfirmOpen(true)}
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
            onPress={() => router.push('/ludo/online')}
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

        {canLoad && (
          <Pressable
            style={[styles.secondaryButton, styles.wideButton]}
            onPress={load}
          >
            <Text style={styles.secondaryButtonText}>📂  {t("load_game")}</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.secondaryButton, styles.wideButton]}
          onPress={() => router.push('/ludo/rules')}
        >
          <Text style={styles.secondaryButtonText}>📖  {t("rules")}</Text>
        </Pressable>

        <View style={styles.settingsRow}>
          <Pressable
            style={[styles.secondaryButton, styles.settingsButton]}
            onPress={() => router.push('/ludo/settings')}
          >
            <Text style={styles.secondaryButtonText}>⚙️  {t("settings")}</Text>
          </Pressable>
          <Pressable
            style={styles.flagButton}
            onPress={() => setLangOpen(true)}
            hitSlop={6}
          >
            <Text style={styles.flag}>{LANGUAGE_FLAGS[language]}</Text>
          </Pressable>
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

        <Pressable
          onPress={() => router.push("/agreement")}
          hitSlop={6}
        >
          <Text style={styles.agreementLink}>{t("agreement_link")}</Text>
        </Pressable>
      </ScrollView>

      <StartGameModal
        visible={confirmOpen}
        colors={colors}
        names={names}
        types={types}
        onSetName={setName}
        onStart={start}
        onClose={() => setConfirmOpen(false)}
      />

      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLangOpen(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t("language")}
            </Text>
            {LANGUAGES.map((lang) => {
              const active = language === lang;
              return (
                <Pressable
                  key={lang}
                  style={[
                    styles.langOption,
                    { borderColor: active ? "#1E88E5" : "transparent" },
                  ]}
                  onPress={() => {
                    setLanguage(lang);
                    setLangOpen(false);
                  }}
                >
                  <Text style={styles.langFlag}>{LANGUAGE_FLAGS[lang]}</Text>
                  <Text
                    style={[styles.langOptionText, { color: theme.textPrimary }]}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {active ? <Text style={styles.langCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

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

      <UnlockCodeModal
        visible={unlockOpen}
        onClose={() => setUnlockOpen(false)}
      />

      <Text style={[styles.buildInfo, { color: theme.textSecondary }]}>
        v{APP_VERSION} ({BUILD_NUMBER}) · OTA {OTA_SHORT_ID ?? t("embedded")}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  setup: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 24,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 360,
    marginTop: 12,
  },
  rowButton: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  wideButton: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  settingsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 360,
    alignItems: "stretch",
  },
  settingsButton: {
    flex: 1,
    alignItems: "center",
  },
  flagButton: {
    width: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1E88E5",
    alignItems: "center",
    justifyContent: "center",
  },
  flag: {
    fontSize: 24,
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
    maxWidth: 320,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  langFlag: {
    fontSize: 24,
  },
  langOptionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  langCheck: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E88E5",
  },
  agreementLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E88E5",
    textDecorationLine: "underline",
    textAlign: "center",
    maxWidth: 320,
    marginTop: 4,
  },
  logoImage: {
    width: 240,
    height: 186,
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 15,
  },
  setupLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  colorCol: {
    alignItems: "center",
    gap: 6,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  typeToggle: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1.5,
  },
  typeIcon: {
    fontSize: 20,
  },
  typeSpacer: {
    height: 32,
  },
  colorCheck: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  countNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E88E5",
  },
  countLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  coffeeWrap: {
    width: "100%",
    maxWidth: 340,
    gap: 8,
  },
  infoLinkWrap: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  infoLink: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  infoBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  infoRestore: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  infoClose: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: "#1E88E5",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  infoCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#1E88E5",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1E88E5",
  },
  secondaryButtonText: {
    color: "#1E88E5",
    fontSize: 16,
    fontWeight: "700",
  },
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
