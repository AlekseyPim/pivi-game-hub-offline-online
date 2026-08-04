import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maybeShowStartRewardedAd } from '@/shared/ads/adService';
import { GAME_ID } from '@/games/sudoku/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { Segmented } from '@/shared/components/Segmented';
import { DIFFICULTIES, MAX_PLAYERS, MIN_PLAYERS } from '@/games/sudoku/constants/board';
import { ACCENT, playerColor } from '@/games/sudoku/constants/colors';
import { useTheme } from '@/games/sudoku/constants/theme';
import { useT } from '@/games/sudoku/i18n/useT';
import { copyToClipboard } from '@/shared/logic/clipboard';
import { isSupabaseConfigured } from '@/shared/net/supabaseClient';
import { useOnlineStore } from '@/games/sudoku/store/onlineStore';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useSetupStore } from '@/games/sudoku/store/setupStore';
import type { Difficulty } from '@/games/sudoku/types/game';

/**
 * Online lobby: create a room (host) or join by code (guest). The host picks
 * the mode. Once the host starts, both sides move to the fleet arrangement.
 */
export function OnlineLobbyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const status = useOnlineStore((s) => s.status);
  const mode = useOnlineStore((s) => s.mode);
  const roomCode = useOnlineStore((s) => s.roomCode);
  const lobby = useOnlineStore((s) => s.lobby);
  const mySlot = useOnlineStore((s) => s.mySlot);
  const error = useOnlineStore((s) => s.error);
  const hostRoom = useOnlineStore((s) => s.hostRoom);
  const joinRoom = useOnlineStore((s) => s.joinRoom);
  const beginMatch = useOnlineStore((s) => s.startGame);
  const setConfig = useOnlineStore((s) => s.setConfig);
  const leave = useOnlineStore((s) => s.leave);
  const adsDisabled = useAdsDisabled();

  const savedName = useSettingsStore((s) => s.onlineName);
  const setOnlineName = useSettingsStore((s) => s.setOnlineName);
  const setupDifficulty = useSetupStore((s) => s.difficulty);

  const [name, setName] = useState(savedName);
  const [code, setCode] = useState('');

  const create = () => {
    const clean = name.trim();
    setOnlineName(clean);
    void hostRoom(clean || t('player'), { difficulty: setupDifficulty });
  };

  const join = () => {
    const clean = name.trim();
    setOnlineName(clean);
    void joinRoom(code, clean || t('player'));
  };

  // Only the host reaches this — show the start rewarded ad, then kick off.
  const startHostMatch = async () => {
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    beginMatch();
  };

  // Both sides enter the board as soon as the match begins.
  useEffect(() => {
    if (status === 'playing') router.replace('/sudoku/game');
  }, [status, router]);

  const goBack = () => {
    leave();
    router.back();
  };

  const header = (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={goBack} hitSlop={12}>
        <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('online_play')}</Text>
    </View>
  );

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          {t('online_unavailable')}
        </Text>
      </SafeAreaView>
    );
  }

  if (status === 'connecting') {
    return (
      <SafeAreaView style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={[styles.note, { color: theme.textSecondary }]}>{t('connecting')}</Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <Text style={[styles.note, { color: '#E53935' }]}>{t('online_error')}</Text>
        {error ? (
          <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{error}</Text>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>{t('back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // In a room (host or guest): the code, the roster and (host) the mode.
  if (status === 'lobby' && lobby) {
    const isHost = mode === 'host';
    const canStart = isHost && lobby.seats.length >= MIN_PLAYERS;
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}

        <Pressable
          style={[styles.codeCard, { backgroundColor: theme.card }]}
          onPress={() => roomCode && copyToClipboard(roomCode, t('code_copied'))}
        >
          <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
            {t('room_code')}
          </Text>
          <Text style={[styles.code, { color: theme.textPrimary }]}>{roomCode}</Text>
          <Text style={[styles.codeHint, { color: theme.textSecondary }]}>
            {t('share_code')}
          </Text>
        </Pressable>

        <View style={styles.seats}>
          {Array.from({ length: MAX_PLAYERS }, (_, slot) => {
            const seat = lobby.seats.find((s) => s.slot === slot);
            const isMe = seat && seat.slot === mySlot;
            return (
              <View key={slot} style={styles.seatCol}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: playerColor(slot),
                      opacity: seat ? 1 : 0.28,
                      borderColor: isMe ? theme.textPrimary : 'transparent',
                    },
                  ]}
                >
                  <Text style={styles.swatchIcon}>{seat ? '👤' : '…'}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.seatCaption, { color: theme.textPrimary }]}>
                  {seat ? (isMe ? t('you') : seat.name) : t('open_seat')}
                </Text>
              </View>
            );
          })}
        </View>

        {isHost ? (
          <View style={styles.config}>
            <Text style={[styles.configTitle, { color: theme.textSecondary }]}>
              {t('host_settings')}
            </Text>
            <Segmented<Difficulty>
              options={DIFFICULTIES.map((value) => ({ value, label: t(value) }))}
              value={lobby.config.difficulty}
              onChange={(next) => setConfig({ difficulty: next })}
              hint={t(`${lobby.config.difficulty}_hint`)}
            />
          </View>
        ) : null}

        {isHost ? (
          <Pressable
            style={[styles.primaryButton, !canStart && styles.disabledButton]}
            onPress={startHostMatch}
            disabled={!canStart}
          >
            <Text style={styles.primaryButtonText}>{t('start_game')}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.note, { color: theme.textSecondary }]}>{t('waiting_host')}</Text>
        )}
      </SafeAreaView>
    );
  }

  // Entry form: create or join.
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}

      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {t('name_shown_hint')}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary }]}
        value={name}
        onChangeText={setName}
        placeholder={t('your_name')}
        placeholderTextColor={theme.textSecondary}
        maxLength={16}
      />

      <Pressable style={styles.primaryButton} onPress={create}>
        <Text style={styles.primaryButtonText}>{t('create_room')}</Text>
      </Pressable>

      <View style={styles.divider}>
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{t('or')}</Text>
      </View>

      <TextInput
        style={[
          styles.input,
          styles.codeInput,
          { backgroundColor: theme.card, color: theme.textPrimary },
        ]}
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        placeholder={t('enter_code')}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={5}
      />
      <Pressable
        style={[styles.secondaryButton, code.trim().length < 4 && styles.disabledButton]}
        onPress={join}
        disabled={code.trim().length < 4}
      >
        <Text style={styles.secondaryButtonText}>{t('join_room')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 26, fontWeight: '800' },
  note: { fontSize: 15, textAlign: 'center', marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: -6 },
  errorDetail: { fontSize: 12, textAlign: 'center' },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '600',
  },
  codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: 22, fontWeight: '800' },
  divider: { alignItems: 'center', paddingVertical: 4 },
  dividerText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  codeCard: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 4 },
  codeLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  code: { fontSize: 44, fontWeight: '900', letterSpacing: 8 },
  codeHint: { fontSize: 13, textAlign: 'center' },
  seats: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  seatCol: { alignItems: 'center', gap: 6, width: 84 },
  swatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchIcon: { fontSize: 24 },
  seatCaption: { fontSize: 12, fontWeight: '700', maxWidth: 82 },
  config: { gap: 12 },
  configTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: 'center',
  },
  secondaryButtonText: { color: ACCENT, fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
