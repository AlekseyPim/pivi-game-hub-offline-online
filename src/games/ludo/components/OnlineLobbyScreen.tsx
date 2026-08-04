import { maybeShowStartRewardedAd } from '@/shared/ads/adService';
import { GAME_ID } from '@/games/ludo/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
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

import { COLOR_ORDER } from '@/games/ludo/constants/board';
import { COLOR_HEX } from '@/games/ludo/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/games/ludo/i18n/useT';
import { copyToClipboard } from '@/shared/logic/clipboard';
import { isSupabaseConfigured } from '@/shared/net/supabaseClient';
import { useOnlineStore } from '@/games/ludo/store/onlineStore';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * Online lobby: create a room (host) or join one by code (guest), see the
 * roster fill up, and — for the host — start the shared game. Navigates to the
 * board once the authoritative game state begins.
 */
export function OnlineLobbyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  const status = useOnlineStore((s) => s.status);
  const mode = useOnlineStore((s) => s.mode);
  const roomCode = useOnlineStore((s) => s.roomCode);
  const lobby = useOnlineStore((s) => s.lobby);
  const myColor = useOnlineStore((s) => s.myColor);
  const error = useOnlineStore((s) => s.error);
  const hostRoom = useOnlineStore((s) => s.hostRoom);
  const joinRoom = useOnlineStore((s) => s.joinRoom);
  const startGame = useOnlineStore((s) => s.startGame);
  const adsDisabled = useAdsDisabled();

  // Only the host reaches this button, so only the host pays the ad — guests
  // are dropped into the match by the broadcast.
  const startHostGame = async () => {
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    startGame();
  };
  const pickColor = useOnlineStore((s) => s.pickColor);
  const addBot = useOnlineStore((s) => s.addBot);
  const removeBot = useOnlineStore((s) => s.removeBot);
  const leave = useOnlineStore((s) => s.leave);
  const savedName = useSettingsStore((s) => s.onlineName);
  const setOnlineName = useSettingsStore((s) => s.setOnlineName);

  const [name, setName] = useState(savedName);
  const [code, setCode] = useState('');

  // Create/join with the entered name, remembering it for next time.
  const create = () => {
    setOnlineName(name.trim());
    hostRoom(name.trim() || t('player'));
  };
  const join = () => {
    setOnlineName(name.trim());
    joinRoom(code, name.trim() || t('player'));
  };

  // Enter the board as soon as the host starts (first authoritative snapshot).
  useEffect(() => {
    if (status === 'playing') router.replace('/ludo/game');
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
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {t('online_play')}
      </Text>
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
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          {t('connecting')}
        </Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <Text style={[styles.note, { color: '#E53935' }]}>
          {t('online_error')}
        </Text>
        {error ? (
          <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{error}</Text>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>{t('back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // In a room (host or guest): show the code and roster.
  if (status === 'lobby' && lobby) {
    const isHost = mode === 'host';
    const canStart = isHost && lobby.seats.length >= 2;
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
          <Text style={[styles.code, { color: theme.textPrimary }]}>
            {roomCode}
          </Text>
          <Text style={[styles.codeHint, { color: theme.textSecondary }]}>
            {t('share_code')}
          </Text>
        </Pressable>

        <Text style={[styles.rosterLabel, { color: theme.textSecondary }]}>
          {t('pick_your_color')}
        </Text>
        <View style={styles.grid}>
          {COLOR_ORDER.map((color) => {
            const seat = lobby.seats.find((s) => s.color === color);
            const open = !seat;
            const isBot = seat?.type === 'bot';
            const isMe = !!seat && seat.color === myColor;
            return (
              <View key={color} style={styles.gridCol}>
                <Pressable
                  onPress={() => {
                    if (open) pickColor(color);
                    else if (isBot && isHost) removeBot(color);
                  }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: COLOR_HEX[color],
                      opacity: open ? 0.28 : 1,
                      borderColor: isMe ? theme.textPrimary : 'transparent',
                    },
                  ]}
                >
                  <Text style={styles.swatchIcon}>
                    {isBot ? '🤖' : open ? '＋' : '👤'}
                  </Text>
                </Pressable>
                <Text
                  numberOfLines={1}
                  style={[styles.seatCaption, { color: theme.textPrimary }]}
                >
                  {isBot
                    ? t('bot')
                    : seat
                      ? isMe
                        ? t('you')
                        : seat.name
                      : t('open_seat')}
                </Text>
                {isHost && open ? (
                  <Pressable
                    onPress={() => addBot(color)}
                    style={[styles.botBtn, { borderColor: COLOR_HEX[color] }]}
                    hitSlop={6}
                  >
                    <Text style={styles.botBtnText}>+🤖</Text>
                  </Pressable>
                ) : (
                  <View style={styles.botBtnSpacer} />
                )}
              </View>
            );
          })}
        </View>

        {isHost ? (
          <Pressable
            style={[styles.primaryButton, !canStart && styles.disabledButton]}
            onPress={startHostGame}
            disabled={!canStart}
          >
            <Text style={styles.primaryButtonText}>{t('start_game')}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            {t('waiting_host')}
          </Text>
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
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
          {t('or')}
        </Text>
      </View>

      <TextInput
        style={[styles.input, styles.codeInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
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
  rosterLabel: { fontSize: 14, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  gridCol: { alignItems: 'center', gap: 6, width: 76 },
  swatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchIcon: { fontSize: 24 },
  seatCaption: { fontSize: 12, fontWeight: '700', maxWidth: 74 },
  botBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  botBtnText: { fontSize: 13, fontWeight: '700' },
  botBtnSpacer: { height: 24 },
  primaryButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1E88E5',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1E88E5', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },
});
