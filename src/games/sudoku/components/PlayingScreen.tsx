import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/shared/components/AdBanner';
import { Board } from '@/games/sudoku/components/Board';
import { EmojiModal } from '@/shared/components/EmojiModal';
import { GameMenuModal } from '@/games/sudoku/components/GameMenuModal';
import { GameOverModal } from '@/games/sudoku/components/GameOverModal';
import { NumberPad } from '@/games/sudoku/components/NumberPad';
import { SHOW_BOARD_BANNER } from '@/shared/constants/ads';
import { playerColor } from '@/games/sudoku/constants/colors';
import { useTheme } from '@/games/sudoku/constants/theme';
import { useT } from '@/games/sudoku/i18n/useT';
import { maybeShowRewardedAd, maybeShowStartRewardedAd } from '@/shared/ads/adService';
import { GAME_ID } from '@/games/sudoku/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { computeResults, remainingDigits } from '@/games/sudoku/logic/gameReducer';
import { conflicts as findConflicts } from '@/games/sudoku/logic/sudoku';
import { useGameStore } from '@/games/sudoku/store/gameStore';
import { useOnlineStore } from '@/games/sudoku/store/onlineStore';
import { useReactionsStore } from '@/games/sudoku/store/reactionsStore';
import { useSaveStore } from '@/games/sudoku/store/saveStore';
import { useSettingsStore } from '@/shared/store/settingsStore';

/** The board screen: the grid, the keypad and everything around them. */
export function PlayingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();

  const game = useGameStore();
  const { phase, cells, online, mySlot, winner, difficulty } = game;

  const onlineMode = useOnlineStore((s) => s.mode);
  const submitIntent = useOnlineStore((s) => s.submitIntent);
  const sendEmoji = useOnlineStore((s) => s.sendEmoji);
  const onlineRestart = useOnlineStore((s) => s.restart);
  const leaveOnline = useOnlineStore((s) => s.leave);
  const disconnected = useOnlineStore((s) => s.disconnected);

  const saveGame = useSaveStore((s) => s.save);
  const playerName = useSettingsStore((s) => s.onlineName);
  const reaction = useReactionsStore((s) => s.reaction);
  const adsDisabled = useAdsDisabled();

  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  const values = useMemo(() => cells.map((c) => c.value), [cells]);
  const conflicts = useMemo(() => findConflicts(values), [values]);
  const remaining = useMemo(() => remainingDigits(game), [game]);

  const boardSize = Math.min(width - 24, 420);
  const cell = selected != null ? cells[selected] : null;
  // Givens are fixed, and in a duel half the grid belongs to the other player.
  const canEdit = cell != null && !cell.given && cell.owner === mySlot && phase === 'playing';

  const act = (fn: () => void, intent: () => void) => {
    if (online) intent();
    else fn();
  };

  const onDigit = (digit: number) => {
    if (!canEdit || cell == null) return;
    if (noteMode) {
      act(
        () => useGameStore.getState().note(cell.index, digit),
        () => submitIntent({ kind: 'note', index: cell.index, digit }),
      );
      return;
    }
    // Tapping the digit that is already there clears it — the usual shortcut.
    const value = cell.value === digit ? 0 : digit;
    act(
      () => useGameStore.getState().write(cell.index, value),
      () => submitIntent({ kind: 'value', index: cell.index, value }),
    );
  };

  const onErase = () => {
    if (!canEdit || cell == null) return;
    act(
      () => useGameStore.getState().erase(cell.index),
      () => submitIntent({ kind: 'erase', index: cell.index }),
    );
  };

  const exit = async () => {
    // Leaving a running game plays a rewarded ad first (win or lose), same as
    // starting one — mirrors ludo-game's handleExit / handleFinishFromGameOver.
    await maybeShowRewardedAd(adsDisabled);
    if (online) leaveOnline();
    else useGameStore.getState().resetGame();
    router.replace('/sudoku');
  };

  const playAgain = async () => {
    setResultDismissed(false);
    setSelected(null);
    // A fresh puzzle is a new game like any other, so it carries the same ad.
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    if (online) onlineRestart();
    else useGameStore.getState().startLocal(difficulty, playerName);
  };

  const results = computeResults(game);
  const mine = results[mySlot];
  const banner =
    phase === 'finished'
      ? winner === mySlot
        ? t('you_win')
        : t('you_lose')
      : `${mine?.filled ?? 0} / ${mine?.total ?? 0}`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => setMenuOpen(true)} hitSlop={10}>
          <Text style={[styles.icon, { color: theme.textPrimary }]}>☰</Text>
        </Pressable>
        <Pressable
          style={styles.bannerWrap}
          disabled={phase !== 'finished'}
          onPress={() => setResultDismissed(false)}
        >
          <Text style={[styles.banner, { color: theme.textPrimary }]} numberOfLines={1}>
            {banner}
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            {t(difficulty)}
          </Text>
        </Pressable>
        {online ? (
          <Pressable style={styles.iconButton} onPress={() => setEmojiOpen(true)} hitSlop={10}>
            <Text style={styles.icon}>🙂</Text>
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {online && disconnected.length ? (
        <Text style={styles.warning}>{t('opponent_left')}</Text>
      ) : null}

      {/* The board is meant to sit still. Scrolling exists only as a fallback
          for short screens, so the rubber band is off and a grid that already
          fits does not drift under the finger. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {online ? (
          <View style={styles.scores}>
            {results.map((r) => (
              <View key={r.index} style={[styles.score, { backgroundColor: theme.card }]}>
                <View style={[styles.dot, { backgroundColor: playerColor(r.index) }]} />
                <Text numberOfLines={1} style={[styles.scoreName, { color: theme.textPrimary }]}>
                  {r.index === mySlot ? t('you') : r.name || t('opponent')}
                </Text>
                <Text style={[styles.scoreValue, { color: theme.textPrimary }]}>
                  {r.filled}/{r.total}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Board
          cells={cells}
          selected={selected}
          conflicts={conflicts}
          showTerritories={online}
          mySlot={mySlot}
          size={boardSize}
          onPressCell={setSelected}
        />

        <NumberPad
          remaining={remaining}
          noteMode={noteMode}
          disabled={!canEdit}
          onDigit={onDigit}
          onErase={onErase}
          onToggleNotes={() => setNoteMode((n) => !n)}
        />

        {online && cell != null && !cell.given && cell.owner !== mySlot ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {t('not_your_cell')}
          </Text>
        ) : null}
      </ScrollView>

      {reaction ? (
        <View pointerEvents="none" style={styles.reactionWrap}>
          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          <Text style={[styles.reactionWho, { color: theme.textSecondary }]}>
            {reaction.mine ? t('you') : t('opponent')}
          </Text>
        </View>
      ) : null}

      <AdBanner enabled={SHOW_BOARD_BANNER} />

      <GameMenuModal
        visible={menuOpen}
        canRestart={!online || onlineMode === 'host'}
        canSave={!online && phase === 'playing'}
        onResume={() => setMenuOpen(false)}
        onRestart={() => {
          setMenuOpen(false);
          void playAgain();
        }}
        onSave={() => {
          setMenuOpen(false);
          void saveGame(useGameStore.getState()).then(() => Alert.alert(t('game_saved')));
        }}
        onSettings={() => {
          setMenuOpen(false);
          router.push('/settings');
        }}
        onExit={() => {
          setMenuOpen(false);
          void exit();
        }}
      />

      <EmojiModal
        visible={emojiOpen}
        onPick={(emoji) => sendEmoji(emoji)}
        onClose={() => setEmojiOpen(false)}
      />

      <GameOverModal
        visible={phase === 'finished' && !resultDismissed}
        won={winner === mySlot}
        online={online}
        results={results}
        mySlot={mySlot}
        elapsedMs={(game.finishedAt ?? game.startedAt) - game.startedAt}
        canRestart={!online || onlineMode === 'host'}
        onDismiss={() => setResultDismissed(true)}
        onPlayAgain={() => void playAgain()}
        onExit={() => void exit()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, fontWeight: '700' },
  bannerWrap: { flex: 1, alignItems: 'center' },
  banner: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '600' },
  warning: {
    textAlign: 'center',
    color: '#E53935',
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 4,
  },
  content: { alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingBottom: 20 },
  scores: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  score: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  scoreName: { flex: 1, fontSize: 13, fontWeight: '700' },
  scoreValue: { fontSize: 14, fontWeight: '800' },
  hint: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  reactionWrap: { position: 'absolute', top: 70, alignSelf: 'center', alignItems: 'center' },
  reactionEmoji: { fontSize: 56 },
  reactionWho: { fontSize: 12, fontWeight: '700' },
});
