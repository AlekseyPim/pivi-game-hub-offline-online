import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR_ORDER } from '@/games/ludo/constants/board';
import { COLOR_HEX } from '@/games/ludo/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/games/ludo/i18n/useT';
import { useGameStore } from '@/games/ludo/store/gameStore';
import { useOnlineStore } from '@/games/ludo/store/onlineStore';
import { useSetupStore, type PlayerNames } from '@/games/ludo/store/setupStore';
import type { PlayerColor } from '@/games/ludo/types/game';

const NAME_MAX_LENGTH = 16;

export function NamesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const storeNames = useSetupStore((s) => s.names);
  const hydrated = useSetupStore((s) => s.hydrated);
  const setName = useSetupStore((s) => s.setName);
  const livePlayers = useGameStore((s) => s.players);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const onlineMode = useOnlineStore((s) => s.mode);
  const renamePlayer = useOnlineStore((s) => s.renamePlayer);
  const online = onlineMode !== 'off';
  // Online: only the host may rename; guests see the roster read-only.
  const canEdit = !online || onlineMode === 'host';

  // Edit a local draft so typing is never interrupted by store churn.
  const [draft, setDraft] = useState<PlayerNames>(storeNames);
  const seeded = useRef(false);
  useEffect(() => {
    if (hydrated && !seeded.current) {
      seeded.current = true;
      // Online: start from the live in-game names (authoritative), not the
      // local setup defaults, so the roster shown matches everyone's board.
      const base = { ...storeNames };
      if (online) for (const p of livePlayers) base[p.color] = p.name;
      setDraft(base);
    }
  }, [hydrated, storeNames, online, livePlayers]);

  const update = (color: PlayerColor, text: string) => {
    if (!canEdit) return;
    setDraft((prev) => ({ ...prev, [color]: text }));
    if (online) {
      renamePlayer(color, text); // host: authoritative rename, broadcast to all
    } else {
      setName(color, text); // persist for future games
      setPlayerName(color, text); // live-update an in-progress game
    }
  };

  const inGameColors = livePlayers.map((p) => p.color);

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
          {t('names')}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {t('names_screen_hint')}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            {COLOR_ORDER.map((color, i) => {
              const inGame = inGameColors.includes(color);
              return (
                <View
                  key={color}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                >
                  <View
                    style={[styles.swatch, { backgroundColor: COLOR_HEX[color] }]}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    value={draft[color]}
                    onChangeText={(text) => update(color, text)}
                    editable={canEdit}
                    placeholder={t(`color_${color}`)}
                    placeholderTextColor={theme.textSecondary}
                    maxLength={NAME_MAX_LENGTH}
                    returnKeyType="done"
                  />
                  {inGame && (
                    <Text style={styles.activeBadge}>{t('in_game')}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    gap: 16,
    paddingBottom: 24,
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
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 4,
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E88E5',
    textTransform: 'uppercase',
  },
});
