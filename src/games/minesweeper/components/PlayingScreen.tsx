import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  maybeShowRewardedAd,
  maybeShowStartRewardedAd,
} from '@/shared/ads/adService';
import { GAME_ID } from '@/games/minesweeper/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { AdBanner } from '@/shared/components/AdBanner';
import { Board } from '@/games/minesweeper/components/Board';
import { EmojiModal } from '@/shared/components/EmojiModal';
import { FIREWORKS_DURATION_MS } from '@/shared/components/Fireworks';
import { GameHud } from '@/games/minesweeper/components/GameHud';
import { GameMenuModal } from '@/games/minesweeper/components/GameMenuModal';
import { GameOverModal } from '@/games/minesweeper/components/GameOverModal';
import { ModeSelector, type InteractionMode } from '@/games/minesweeper/components/ModeSelector';
import { SHOW_BOARD_BANNER } from '@/shared/constants/ads';
import { boardPalette } from '@/games/minesweeper/constants/colors';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import { computeResults } from '@/games/minesweeper/logic/gameReducer';
import { useFireworksStore } from '@/shared/store/fireworksStore';
import { useGameStore } from '@/games/minesweeper/store/gameStore';
import { useOnlineStore } from '@/games/minesweeper/store/onlineStore';
import { usePrefsStore } from '@/games/minesweeper/store/prefsStore';
import { useReactionsStore } from '@/games/minesweeper/store/reactionsStore';
import { useSaveStore } from '@/games/minesweeper/store/saveStore';
import { useSupporterStore } from '@/shared/store/supporterStore';

const BOARD_MAX = 520;

/**
 * The board screen. Renders whatever is in `gameStore` — a local single-player
 * game or the authoritative online snapshot — and routes taps to either the
 * local reducer or the online host via intents.
 */
export function PlayingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const palette = boardPalette(usePrefsStore((s) => s.boardTheme));
  const adsDisabled = useAdsDisabled();
  const isSupporter = useSupporterStore((s) => s.isSupporter);

  // Rendered game state (local or mirrored remote).
  const state = useGameStore((s) => s);
  const reveal = useGameStore((s) => s.reveal);
  const cycleMark = useGameStore((s) => s.cycleMark);
  const toggleMark = useGameStore((s) => s.toggleMark);
  const clearMark = useGameStore((s) => s.clearMark);
  const startLocal = useGameStore((s) => s.startLocal);
  const resetGame = useGameStore((s) => s.resetGame);

  // Online wiring.
  const online = useOnlineStore((s) => s.mode !== 'off');
  const isHost = useOnlineStore((s) => s.mode === 'host');
  const onlineSlot = useOnlineStore((s) => s.mySlot);
  const hostLost = useOnlineStore((s) => s.hostLost);
  const submitIntent = useOnlineStore((s) => s.submitIntent);
  const sendEmoji = useOnlineStore((s) => s.sendEmoji);
  const onlineRestart = useOnlineStore((s) => s.restart);
  const leaveOnline = useOnlineStore((s) => s.leave);

  const reactions = useReactionsStore((s) => s.reactions);
  const saveGame = useSaveStore((s) => s.save);
  const celebrate = useFireworksStore((s) => s.celebrate);

  const mySlot = online ? onlineSlot : 0;
  const canRestart = !online || isHost;
  // Only a live, local game can be saved to the resume slot.
  const canSave = !online && state.phase === 'playing';

  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<number | null>(null);
  const [mode, setMode] = useState<InteractionMode>('reveal');
  const [showOver, setShowOver] = useState(false);

  // No game loaded (e.g. deep link / reset) — bounce back to the menu.
  useEffect(() => {
    if (state.cells.length === 0 && !online) router.replace('/minesweeper');
  }, [state.cells.length, online, router]);

  // A win fires the multicolour salute and, once it has fully played out, opens
  // the result modal. A loss just pauses briefly (so the exploded board is seen)
  // before the modal; a fresh game hides it. Dismiss/reopen on a loss is manual
  // (see the "finish game" button) and never re-triggered here — this effect only
  // runs on a phase transition.
  useEffect(() => {
    // Supporters get a golden victory salute; everyone else the rainbow one.
    if (state.phase === 'won') celebrate({ gold: isSupporter });
    const delay =
      state.phase === 'won'
        ? FIREWORKS_DURATION_MS
        : state.phase === 'lost'
          ? 600
          : 0;
    const id = setTimeout(() => setShowOver(state.phase !== 'playing'), delay);
    return () => clearTimeout(id);
  }, [state.phase, celebrate, isSupporter]);

  // Short buzz whenever a mine detonates. Every mine hit — whether it spends a
  // life or ends the game — flips a cell to `exploded`, so a rising exploded
  // count is the reliable signal (works for both local and mirrored online play).
  const explodedCount = state.cells.reduce((n, c) => n + (c.exploded ? 1 : 0), 0);
  const prevExploded = useRef(explodedCount);
  useEffect(() => {
    if (explodedCount > prevExploded.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    prevExploded.current = explodedCount;
  }, [explodedCount]);

  const doMark = useCallback(
    (index: number, m: 'cycle' | 'flag' | 'question' | 'clear') => {
      if (online) submitIntent({ kind: 'mark', index, mode: m });
      else if (m === 'cycle') cycleMark(index);
      else if (m === 'clear') clearMark(index);
      else toggleMark(index, m);
    },
    [online, submitIntent, cycleMark, toggleMark, clearMark],
  );

  const onPress = useCallback(
    (index: number) => {
      const cell = state.cells[index];
      if (!cell || state.phase !== 'playing') return;
      const ownHidden =
        mySlot != null && cell.owner === mySlot && cell.state === 'hidden';
      if (ownHidden) {
        // The selected mode decides what a tap does.
        if (mode === 'reveal') {
          // A flag or "?" shields the cell: a tap must never open it — you have
          // to clear the mark first. Bail before dispatching (the reducer also
          // enforces this, so this just skips a no-op / online round-trip).
          if (cell.mark === 'flag' || cell.mark === 'question') return;
          if (online) submitIntent({ kind: 'reveal', index });
          else reveal(index);
        } else {
          doMark(index, mode);
        }
      } else if (online && cell.owner !== mySlot && cell.mark === 'question') {
        // React to an opponent's "?" with an emoji.
        setEmojiTarget(index);
      }
    },
    [state.cells, state.phase, mySlot, mode, online, submitIntent, reveal, doMark],
  );

  const onLongPress = useCallback(
    (index: number) => {
      const cell = state.cells[index];
      if (!cell || state.phase !== 'playing') return;
      // Long-press always cycles the mark on your own hidden cell, whatever the
      // current mode — a quick shortcut.
      if (mySlot != null && cell.owner === mySlot && cell.state === 'hidden') {
        doMark(index, 'cycle');
      }
    },
    [state.cells, state.phase, mySlot, doMark],
  );

  const exit = useCallback(() => {
    if (online) leaveOnline();
    else resetGame();
    router.replace('/minesweeper');
  }, [online, leaveOnline, resetGame, router]);

  // Leaving a running/finished game plays a rewarded ad first (win or
  // lose) — mirrors ludo-game's handleExit / handleFinishFromGameOver.
  const exitMatch = useCallback(async () => {
    await maybeShowRewardedAd(adsDisabled);
    exit();
  }, [adsDisabled, exit]);

  const saveCurrent = useCallback(() => {
    void saveGame(state);
    Alert.alert(t('game_saved'));
  }, [saveGame, state, t]);

  const playAgain = useCallback(async () => {
    // A re-deal is a new game like any other, so it carries the same ad.
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    if (online) {
      onlineRestart();
      return;
    }
    startLocal({
      size: state.size,
      // Reuse the exact mine count of the finished game (preserves the density).
      mines: state.mines,
      difficulty: state.difficulty,
      turnMode: 'parallel',
      players: [{ name: state.players[0]?.name ?? '' }],
    });
  }, [adsDisabled, online, onlineRestart, startLocal, state]);

  if (state.cells.length === 0) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} />;
  }

  // Square viewport the board is drawn into. At rest the board fits exactly; for
  // boards larger than 9×9 the Board adds pinch-zoom + pan to explore it closer.
  const viewport = Math.floor(Math.min(width - 24, BOARD_MAX));
  const lost = state.phase === 'lost';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)} hitSlop={10}>
          <Text style={[styles.menuIcon, { color: theme.textPrimary }]}>☰</Text>
        </Pressable>
      </View>

      <GameHud state={state} mySlot={mySlot} />

      <View style={styles.boardWrap}>
        <Board
          key={state.size}
          cells={state.cells}
          gridSize={state.size}
          viewport={viewport}
          theme={theme}
          palette={palette}
          mySlot={mySlot}
          playerCount={state.players.length}
          reactions={reactions}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      </View>

      {state.phase === 'playing' ? (
        <>
          <ModeSelector mode={mode} onChange={setMode} />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {t('rule_mark')}
          </Text>
        </>
      ) : null}

      <AdBanner enabled={SHOW_BOARD_BANNER} />

      {/* After a loss the result modal can be dismissed to inspect the board;
          this button brings it back. */}
      {lost && !showOver ? (
        <Pressable style={styles.finishButton} onPress={() => setShowOver(true)}>
          <Text style={styles.finishButtonText}>{t('finish_game')}</Text>
        </Pressable>
      ) : null}

      {online && hostLost ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('waiting_host')}</Text>
        </View>
      ) : null}

      <GameMenuModal
        visible={menuOpen}
        canRestart={canRestart}
        canSave={canSave}
        onResume={() => setMenuOpen(false)}
        onRestart={() => {
          setMenuOpen(false);
          playAgain();
        }}
        onSave={() => {
          setMenuOpen(false);
          saveCurrent();
        }}
        onSettings={() => {
          setMenuOpen(false);
          router.push('/minesweeper/settings');
        }}
        onExit={() => {
          setMenuOpen(false);
          void exitMatch();
        }}
      />

      <GameOverModal
        visible={showOver}
        phase={state.phase}
        results={computeResults(state)}
        totalMines={state.mines}
        mySlot={mySlot}
        canRestart={canRestart}
        dismissible={lost}
        onDismiss={() => setShowOver(false)}
        onPlayAgain={playAgain}
        onExit={exitMatch}
      />

      <EmojiModal
        visible={emojiTarget != null}
        onClose={() => setEmojiTarget(null)}
        onPick={(emoji) => {
          if (emojiTarget != null) sendEmoji(emojiTarget, emoji);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 12, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 26, fontWeight: '800' },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  finishButton: {
    alignSelf: 'stretch',
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  finishButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  banner: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  bannerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
