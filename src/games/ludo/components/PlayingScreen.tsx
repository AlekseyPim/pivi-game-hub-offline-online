import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/shared/components/AdBanner';
import {
  maybeShowRewardedAd,
  maybeShowStartRewardedAd,
} from '@/shared/ads/adService';
import { GAME_ID } from '@/games/ludo/constants/app';
import { useAdsDisabled } from '@/shared/ads/useAdsDisabled';
import { Board } from '@/games/ludo/components/Board';
import { Dice } from '@/games/ludo/components/Dice';
import { EmojiModal } from '@/shared/components/EmojiModal';
import { GameMenuModal } from '@/games/ludo/components/GameMenuModal';
import { GameOverModal } from '@/games/ludo/components/GameOverModal';
import { PlayerPanel } from '@/games/ludo/components/PlayerPanel';
import { SHOW_BOARD_BANNER } from '@/shared/constants/ads';
import { JUMP_DURATION, STEP_DURATION } from '@/games/ludo/constants/animation';
import {
  COLOR_ORDER,
  FINISH_PROGRESS,
  LAST_MAIN_PROGRESS,
} from '@/games/ludo/constants/board';
import { useTheme } from '@/shared/constants/theme';
import { praiseAt, randomPraise, type PraiseKind } from '@/games/ludo/i18n/praise';
import { useLanguage, useT } from '@/games/ludo/i18n/useT';
import { simpleBotAdapter } from '@/games/ludo/logic/botAdapter';
import {
  isSafeIndex,
  mainIndexForProgress,
  movePreviewCells,
} from '@/games/ludo/logic/boardPath';
import { copyToClipboard } from '@/shared/logic/clipboard';
import { emojiForName } from '@/games/ludo/logic/nameEmoji';
import { saveGame } from '@/games/ludo/logic/persistence';
import { findCaptures, progressAfterMove } from '@/games/ludo/logic/rules';
import { ludoCelebration } from '@/games/ludo/logic/celebration';
import { useFireworksStore } from '@/shared/store/fireworksStore';
import { useOnlineStore } from '@/games/ludo/store/onlineStore';
import { usePrefsStore } from '@/games/ludo/store/prefsStore';
import { useSupporterStore } from '@/shared/store/supporterStore';
import { useGameStore } from '@/games/ludo/store/gameStore';
import type { Coord, Player, PlayerColor, Token } from '@/games/ludo/types/game';

// The bot "thinks" for a random 1–2 seconds before rolling and before moving —
// unless fast mode is on, in which case it acts immediately.
const BOT_THINK_MIN_MS = 1000;
const BOT_THINK_MAX_MS = 2000;
const botThinkMs = (fast: boolean) =>
  fast
    ? 0
    : BOT_THINK_MIN_MS +
      Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS));
const NO_MOVE_PASS_MS = 900;
const AUTO_MOVE_MS = 450;
const MAX_BOARD = 760;

// Screen corners in clockwise order: 0=top-left, 1=top-right, 2=bottom-right,
// 3=bottom-left — matching each colour's home corner on the standard board.
const CORNER_CW: Record<PlayerColor, number> = {
  red: 0,
  green: 1,
  yellow: 2,
  blue: 3,
};

// The die tumbles for a random duration in this window before it settles.
const ROLL_MIN_MS = 700;
const ROLL_MAX_MS = 1000;
// Fast mode: a single fixed, short tumble.
const FAST_ROLL_MS = 500;

// How long a praise line lingers (also cleared as soon as the next roll happens).
const PRAISE_MS = 5000;

// The winning move's fireworks fly for a beat before the summary covers them:
// the finishing token's hop (≤ ~1.4s) plus the ~3.6s the bursts stay in motion.
const GAME_OVER_DELAY_MS = 5200;

/**
 * Small deterministic string → non-negative int hash. Online play seeds the
 * praise-line picker with this so every device selects the same line for a move.
 */
function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Turn hints under/over the board ("roll the dice", etc.) — temporarily hidden.
const SHOW_TURN_HINTS = false;

export function PlayingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const adsDisabled = useAdsDisabled();
  const t = useT();
  const language = useLanguage();
  const celebrate = useFireworksStore((s) => s.celebrate);
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const {
    players,
    tokens,
    currentPlayerIndex,
    diceValue,
    diceRolled,
    movableTokenIds,
    selectedTokenId,
    turnStatus,
    rankings,
    moveCount,
    captures,
    rollDice,
    selectToken,
    moveToken,
    resolveCapture,
    nextTurn,
    resetGame,
    restartGame,
  } = useGameStore();

  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 2, height - 210, MAX_BOARD);

  const onlineMode = useOnlineStore((s) => s.mode);
  const myColor = useOnlineStore((s) => s.myColor);
  const submitIntent = useOnlineStore((s) => s.submitIntent);
  const hostDrive = useOnlineStore((s) => s.hostDrive);
  const leaveOnline = useOnlineStore((s) => s.leave);
  const restartOnline = useOnlineStore((s) => s.startGame);
  const disconnected = useOnlineStore((s) => s.disconnected);
  const hostLost = useOnlineStore((s) => s.hostLost);
  const roomCode = useOnlineStore((s) => s.roomCode);
  const sendEmoji = useOnlineStore((s) => s.sendEmoji);
  const online = onlineMode !== 'off';
  const isHost = onlineMode === 'host';

  // Fast mode: local games use this device's preference; online games follow the
  // host's session setting (mirrored on the lobby) so it never overrides a
  // guest's own persisted choice.
  const localFastMode = usePrefsStore((s) => s.fastMode);
  const sessionFastMode = useOnlineStore((s) => s.lobby?.fastMode ?? false);
  const fastMode = online ? sessionFastMode : localFastMode;

  const currentPlayer = players[currentPlayerIndex];
  const isBotTurn = currentPlayer?.type === 'bot';
  const gameOver = turnStatus === 'finished';
  // Online: only the device that owns the current colour may act; others watch.
  const isMyTurn = !online || currentPlayer?.color === myColor;

  // A disconnected player (or a lost host) pauses the whole match until they
  // return or someone leaves.
  const paused = online && !gameOver && (disconnected.length > 0 || hostLost);

  // Single-viewer perspective: rotate the board + panels so the viewer's colour
  // sits bottom-right. Online → my seat; local with exactly one human → that
  // human; otherwise (shared hotseat) keep the standard orientation.
  const humanColors = players.filter((p) => p.type === 'human');
  const viewerColor = online
    ? myColor
    : humanColors.length === 1
      ? humanColors[0].color
      : null;
  const rotationSteps = viewerColor
    ? (((2 - CORNER_CW[viewerColor]) % 4) + 4) % 4
    : 0;
  // Which colour's panel sits at each screen corner (0=TL,1=TR,2=BR,3=BL).
  const cornerColor = {} as Record<number, PlayerColor>;
  for (const c of COLOR_ORDER) {
    cornerColor[(CORNER_CW[c] + rotationSteps) % 4] = c;
  }

  // Route an action locally (hotseat) or as an intent to the host (online).
  const doRoll = () => (online ? submitIntent({ kind: 'roll' }) : rollDice());
  const doNextTurn = () => (online ? submitIntent({ kind: 'nextTurn' }) : nextTurn());
  const noMoves =
    turnStatus === 'moving' && diceRolled && movableTokenIds.length === 0;

  // Cells of the pending move, shown as a pulsing highlight path. The colour is
  // frozen to the moving player so it doesn't flip when the turn advances mid-animation.
  const [highlightCells, setHighlightCells] = useState<Coord[]>([]);
  const [highlightColor, setHighlightColor] = useState<PlayerColor>('red');
  // True while the die is visually tumbling; locks moves until it settles.
  const [isRolling, setIsRolling] = useState(false);
  // In-game menu modal + a transient "saved" confirmation.
  const [menuOpen, setMenuOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // Online emoji-reaction picker.
  const [emojiOpen, setEmojiOpen] = useState(false);
  // A cheering line shown under the board for the special heart-named player.
  // The text persists (for the fade-out); `praiseVisible` drives the fade.
  const [praiseText, setPraiseText] = useState('');
  const [praiseVisible, setPraiseVisible] = useState(false);
  // The end-game summary is held back until the victory fireworks have played.
  const [gameOverVisible, setGameOverVisible] = useState(false);

  // A rolled 6 with at least one token still in base pulses that player's yard.
  const hasBaseToken = tokens.some(
    (t) => t.color === currentPlayer?.color && t.status === 'base',
  );
  const pulseBaseColor =
    diceRolled && diceValue === 6 && !isRolling && !isBotTurn && hasBaseToken
      ? currentPlayer.color
      : null;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  const praiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last-seen tokens, used to detect a move from an incoming online snapshot.
  const prevTokensRef = useRef(tokens);
  // Guards the online bot driver so it acts at most once per authoritative state.
  const botSigRef = useRef('');
  // Path-highlight peel timers live on their own list so a new move can cancel a
  // previous move's leftover peel (otherwise a stale timer re-paints an old path
  // and it "freezes" on screen).
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearHighlight = () => {
    highlightTimers.current.forEach(clearTimeout);
    highlightTimers.current = [];
    setHighlightCells([]);
  };
  /** Paint a move's path, then peel a cell away on each hop until it's empty. */
  const peelHighlight = (path: Coord[], color: PlayerColor, stepMs: number) => {
    highlightTimers.current.forEach(clearTimeout);
    highlightTimers.current = [];
    setHighlightColor(color);
    setHighlightCells(path);
    for (let k = 1; k <= path.length; k++) {
      const id = setTimeout(() => setHighlightCells(path.slice(k)), k * stepMs);
      highlightTimers.current.push(id);
    }
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    highlightTimers.current.forEach(clearTimeout);
    highlightTimers.current = [];
    if (praiseTimer.current) {
      clearTimeout(praiseTimer.current);
      praiseTimer.current = null;
    }
  };
  useEffect(() => clearTimers, []);

  /** Show a cheering line under the board, fading it out after a few seconds. */
  const showPraise = (message: string) => {
    setPraiseText(message);
    setPraiseVisible(true);
    if (praiseTimer.current) clearTimeout(praiseTimer.current);
    praiseTimer.current = setTimeout(() => setPraiseVisible(false), PRAISE_MS);
  };

  /**
   * Which notable thing (if any) this move does, ranked so the most impressive
   * one wins: finish > capture > leaving base > reaching a safe square. Takes the
   * pre-move token set explicitly so it works from both a local move (current
   * tokens) and a reconstructed online move (the previous snapshot).
   */
  const praiseKindFor = (
    tokensBefore: Token[],
    token: Token,
    dice: number,
  ): PraiseKind | null => {
    const landing = progressAfterMove(token, dice);
    if (landing === FINISH_PROGRESS) return 'finish';
    if (findCaptures(tokensBefore, token, dice).length > 0) return 'capture';
    if (token.status === 'base') return 'leaveBase';
    if (
      landing <= LAST_MAIN_PROGRESS &&
      isSafeIndex(mainIndexForProgress(token.color, landing))
    ) {
      return 'safe';
    }
    return null;
  };

  // The player's name if this colour is a heart-named *human* (never a bot),
  // else null — only such players get the easter-egg cheers.
  const heartHumanName = (color: PlayerColor): string | null => {
    const p = players.find((pl) => pl.color === color);
    if (!p || p.type !== 'human') return null;
    return emojiForName(p.name) === '❤️' ? p.name : null;
  };

  /**
   * The cheer (kind + whom to name) a move earns for a heart-named human, or
   * null. `gotCaptured` (a heart player's token knocked out) outranks the mover's
   * own praise. Pure over its inputs, so every device derives the same result.
   */
  const praiseInfoFor = (
    tokensBefore: Token[],
    movedBefore: Token,
    dice: number,
  ): { kind: PraiseKind; name: string } | null => {
    const victimName = findCaptures(tokensBefore, movedBefore, dice)
      .map((id) => tokensBefore.find((tk) => tk.id === id))
      .map((tk) => (tk ? heartHumanName(tk.color) : null))
      .find((n): n is string => n !== null);
    if (victimName) return { kind: 'gotCaptured', name: victimName };
    const moverName = heartHumanName(movedBefore.color);
    if (!moverName) return null;
    const kind = praiseKindFor(tokensBefore, movedBefore, dice);
    return kind ? { kind, name: moverName } : null;
  };

  // Guard: reaching /game without an active game (e.g. deep link or reload)
  // bounces back to the menu rather than rendering an empty board.
  useEffect(() => {
    if (players.length === 0) router.replace('/ludo');
  }, [players.length, router]);

  // Hold the end-game summary back until the victory fireworks have played out.
  // The cleanup hides it again when the finished state clears (restart / new
  // game), so a later game-over in the same session still waits the full delay.
  useEffect(() => {
    if (!gameOver) return;
    const id = setTimeout(() => setGameOverVisible(true), GAME_OVER_DELAY_MS);
    return () => {
      clearTimeout(id);
      setGameOverVisible(false);
    };
  }, [gameOver]);

  /**
   * Commit a move: keep the previewed path on screen, then peel cells away one
   * hop at a time so a cell's highlight vanishes exactly as the token leaves it.
   */
  const performMove = (tokenId: string) => {
    if (diceValue == null) return;
    // Online: hand the move to the host; the board updates from its snapshot,
    // and the shared move-animation effect paints the path on every device.
    if (online) {
      clearHighlight();
      submitIntent({ kind: 'move', tokenId });
      return;
    }
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const path = movePreviewCells(token, diceValue);
    const stepMs = token.status === 'base' ? JUMP_DURATION : STEP_DURATION;

    // Cheer the heart-named human on a notable move (or console her on a hit).
    const praise = praiseInfoFor(tokens, token, diceValue);
    if (praise) showPraise(randomPraise(language, praise.kind, praise.name));

    peelHighlight(path, token.color, stepMs);
    moveToken(tokenId);

    // Send any captured token home exactly when the mover lands on its square.
    schedule(resolveCapture, path.length * stepMs);

    // If this brings the player's last token home, fire celebratory fireworks
    // in their colour (hearts for the special heart-named player) once it lands.
    const ownTokens = useGameStore
      .getState()
      .tokens.filter((tk) => tk.color === token.color);
    if (ownTokens.every((tk) => tk.status === 'finished')) {
      const finisher = players.find((p) => p.color === token.color)?.name ?? '';
      const heart = emojiForName(finisher) === '❤️';
      schedule(
        () => celebrate(ludoCelebration(token.color, heart, isSupporter)),
        path.length * stepMs,
      );
    }
  };

  /** Roll the die and play the tumble animation for a random 1–2 seconds. */
  const handleRoll = () => {
    if (turnStatus !== 'rolling' || diceRolled || isRolling) return;
    if (!isMyTurn || paused) return;
    // Don't dismiss the previous cheer here — let it live out its full 5s timer.
    doRoll();
    setIsRolling(true);
    const duration = fastMode
      ? FAST_ROLL_MS
      : ROLL_MIN_MS + Math.floor(Math.random() * (ROLL_MAX_MS - ROLL_MIN_MS));
    schedule(() => setIsRolling(false), duration);
  };

  // Auto-pass when a roll yields no legal move (after the die settles). Online:
  // only the player whose turn it is issues the pass.
  useEffect(() => {
    if (noMoves && !gameOver && !isRolling && isMyTurn && !paused) {
      schedule(doNextTurn, NO_MOVE_PASS_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMoves, gameOver, isRolling, currentPlayerIndex, isMyTurn, paused]);

  // When there is exactly one legal move, play it automatically.
  useEffect(() => {
    if (isBotTurn || gameOver || isRolling || !isMyTurn || paused) return;
    if (turnStatus === 'moving' && diceRolled && movableTokenIds.length === 1) {
      const onlyId = movableTokenIds[0];
      schedule(() => performMove(onlyId), AUTO_MOVE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnStatus, diceRolled, movableTokenIds.length, isBotTurn, gameOver, isRolling, paused]);

  // Drive bot turns through the adapter seam (local games only).
  useEffect(() => {
    if (online || !isBotTurn || gameOver || isRolling) return;

    if (turnStatus === 'rolling') {
      schedule(handleRoll, botThinkMs(fastMode));
    } else if (turnStatus === 'moving' && movableTokenIds.length > 0) {
      schedule(() => {
        void simpleBotAdapter
          .chooseMove({
            color: currentPlayer.color,
            diceValue: diceValue ?? 0,
            tokens,
            movableTokenIds,
          })
          .then((tokenId) => {
            if (tokenId) performMove(tokenId);
          });
      }, botThinkMs(fastMode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, turnStatus, diceRolled, movableTokenIds.length, gameOver, isRolling]);

  // Online: the host is the only device that advances bot seats. Each distinct
  // authoritative state triggers at most one bot action (roll / move / pass).
  useEffect(() => {
    if (!online || !isHost || !isBotTurn || gameOver || paused) return;
    const sig = `${currentPlayerIndex}:${turnStatus}:${diceRolled}:${moveCount}`;
    if (botSigRef.current === sig) return;
    botSigRef.current = sig;

    const color = currentPlayer.color;
    if (turnStatus === 'rolling') {
      schedule(() => hostDrive(color, { kind: 'roll' }), botThinkMs(fastMode));
    } else if (turnStatus === 'moving') {
      if (movableTokenIds.length === 0) {
        schedule(() => hostDrive(color, { kind: 'nextTurn' }), NO_MOVE_PASS_MS);
      } else {
        schedule(() => {
          void simpleBotAdapter
            .chooseMove({
              color,
              diceValue: diceValue ?? 0,
              tokens,
              movableTokenIds,
            })
            .then((tokenId) => {
              if (tokenId) hostDrive(color, { kind: 'move', tokenId });
            });
        }, botThinkMs(fastMode));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, isHost, isBotTurn, turnStatus, diceRolled, movableTokenIds.length, gameOver, currentPlayerIndex, moveCount, paused]);

  // Online: nobody moves the board locally — every device (mover and observers
  // alike) reconstructs the move from the authoritative snapshot and paints the
  // same travelled path + destination that the local hotseat shows.
  useEffect(() => {
    const prev = prevTokensRef.current;
    prevTokensRef.current = tokens;
    if (!online) return;

    const moved = tokens.find((t) => {
      const before = prev.find((x) => x.id === t.id);
      if (!before) return false;
      return (
        (before.status === 'base' && t.status !== 'base') ||
        t.progress > before.progress
      );
    });
    if (!moved) return;

    const before = prev.find((x) => x.id === moved.id)!;
    const die = before.status === 'base' ? 6 : moved.progress - before.progress;
    const path = movePreviewCells(before, die);
    if (path.length === 0) return;
    const stepMs = before.status === 'base' ? JUMP_DURATION : STEP_DURATION;

    peelHighlight(path, moved.color, stepMs);
    // Send any captured token home as the mover lands on its square.
    schedule(resolveCapture, path.length * stepMs);

    // Cheer a heart-named human, on every device — seeded from the move itself
    // (token + destination + kind) so all players read the identical line.
    const praise = praiseInfoFor(prev, before, die);
    if (praise) {
      const seed = seedFrom(`${moved.id}:${moved.progress}:${praise.kind}`);
      showPraise(praiseAt(language, praise.kind, praise.name, seed));
    }

    // Celebrate when this move brings a player's last token home.
    const ownTokens = tokens.filter((tk) => tk.color === moved.color);
    if (ownTokens.every((tk) => tk.status === 'finished')) {
      const finisher = players.find((p) => p.color === moved.color)?.name ?? '';
      const heart = emojiForName(finisher) === '❤️';
      schedule(
        () => celebrate(ludoCelebration(moved.color, heart, isSupporter)),
        path.length * stepMs,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, online]);

  const onTokenPress = (tokenId: string) => {
    if (isBotTurn || isRolling || !isMyTurn || paused) return;
    if (selectedTokenId === tokenId) {
      // Second tap on the already-selected token commits the move.
      performMove(tokenId);
      return;
    }
    // First tap selects the token (it starts pulsing) and previews its path.
    selectToken(tokenId);
    const token = tokens.find((t) => t.id === tokenId);
    if (token && diceValue != null) {
      setHighlightColor(token.color);
      setHighlightCells(movePreviewCells(token, diceValue));
    }
  };

  const openMenu = () => {
    setJustSaved(false);
    setMenuOpen(true);
  };

  const handleSave = () => {
    void saveGame({
      players,
      tokens,
      currentPlayerIndex,
      rankings,
      moveCount,
      captures,
    }).then(() => setJustSaved(true));
  };

  const handleRestart = async () => {
    clearTimers();
    setMenuOpen(false);
    setPraiseVisible(false);
    // A re-deal is a new game like any other, so it carries the same ad.
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    if (online) {
      // Only the host can re-deal; it re-broadcasts a fresh game to everyone.
      restartOnline();
    } else {
      restartGame();
    }
  };

  const handleNames = () => {
    setMenuOpen(false);
    router.push('/ludo/names');
  };

  const handleRules = () => {
    setMenuOpen(false);
    router.push('/ludo/rules');
  };

  const handleSettings = () => {
    setMenuOpen(false);
    router.push('/ludo/settings');
  };

  const handleExit = async () => {
    setMenuOpen(false);
    // Leaving a running game plays a rewarded ad first (win or lose).
    await maybeShowRewardedAd(adsDisabled);
    clearTimers();
    if (online) leaveOnline();
    resetGame();
    router.replace('/ludo');
  };

  const handleNewGame = () => {
    clearTimers();
    if (online) leaveOnline();
    resetGame();
    router.replace('/ludo');
  };

  // Leaving the game-over (victory) modal plays a rewarded ad first.
  const handleFinishFromGameOver = async () => {
    await maybeShowRewardedAd(adsDisabled);
    handleNewGame();
  };

  const hint = buildHint({
    turnStatus,
    diceRolled,
    noMoves,
    selectedTokenId,
    isBotTurn,
    isRolling,
    name: currentPlayer?.name ?? '',
    t,
  });

  const playerByColor = (color: PlayerColor) =>
    players.find((p) => p.color === color);

  const renderSlot = (color: PlayerColor, side: 'left' | 'right') => (
    <PlayerSlot
      player={playerByColor(color)}
      side={side}
      tokens={tokens}
      isCurrent={color === currentPlayer?.color}
      onEmojiPress={
        online && color === myColor ? () => setEmojiOpen(true) : undefined
      }
      dice={
        <Dice
          value={diceValue}
          color={color}
          disabled={turnStatus !== 'rolling' || isBotTurn || isRolling || !isMyTurn}
          rolling={isRolling}
          onRoll={handleRoll}
        />
      }
    />
  );

  return (
    <SafeAreaView style={[styles.play, { backgroundColor: theme.background }]}>
      {/* Top edge: whichever colours map to the two top corners. */}
      <View style={styles.sideRow}>
        {renderSlot(cornerColor[0], 'left')}
        {renderSlot(cornerColor[1], 'right')}
      </View>

      <View style={styles.boardWrap}>
        {SHOW_TURN_HINTS && (
          <Text
            style={[
              styles.hint,
              styles.hintFlipped,
              { color: theme.textPrimary },
            ]}
          >
            {hint}
          </Text>
        )}
        <Board
          tokens={tokens}
          players={players}
          boardSize={boardSize}
          movableTokenIds={isBotTurn || isRolling ? [] : movableTokenIds}
          interactive={!isBotTurn && !isRolling && isMyTurn && !paused}
          selectedTokenId={selectedTokenId}
          highlightCells={highlightCells}
          highlightColor={highlightColor}
          pulseBaseColor={pulseBaseColor}
          currentColor={currentPlayer?.color ?? null}
          rankings={rankings}
          onTokenPress={onTokenPress}
          onMenuPress={openMenu}
          rotationSteps={rotationSteps}
        />
        {SHOW_TURN_HINTS && (
          <Text style={[styles.hint, { color: theme.textPrimary }]}>{hint}</Text>
        )}
        <PraiseBanner text={praiseText} visible={praiseVisible} raised={online} />
        <PraiseBanner text={praiseText} visible={praiseVisible} flipped />
      </View>

      {/* Bottom edge: whichever colours map to the two bottom corners. */}
      <View style={styles.sideRow}>
        {renderSlot(cornerColor[3], 'left')}
        {renderSlot(cornerColor[2], 'right')}
      </View>

      <AdBanner enabled={SHOW_BOARD_BANNER} />

      <GameOverModal
        visible={gameOverVisible}
        players={players}
        rankings={rankings}
        moveCount={moveCount}
        captures={captures}
        onFinish={handleFinishFromGameOver}
      />

      <Modal visible={paused} transparent animationType="fade">
        <View style={styles.pauseBackdrop}>
          <View style={[styles.pauseCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={[styles.pauseTitle, { color: theme.textPrimary }]}>
              {t('paused_title')}
            </Text>
            <Text style={[styles.pauseBody, { color: theme.textSecondary }]}>
              {hostLost
                ? t('host_lost')
                : t('waiting_return', {
                    names: disconnected
                      .map(
                        (c) => players.find((p) => p.color === c)?.name ?? c,
                      )
                      .join(', '),
                  })}
            </Text>
            {roomCode ? (
              <Pressable
                style={styles.pauseCodeBox}
                onPress={() => copyToClipboard(roomCode, t('code_copied'))}
              >
                <Text style={styles.pauseCodeLabel}>{t('room_code')}</Text>
                <Text style={styles.pauseCode}>{roomCode}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.pauseExit} onPress={handleExit}>
              <Text style={styles.pauseExitText}>{t('exit')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <EmojiModal
        visible={emojiOpen}
        onPick={(e) => {
          sendEmoji(e);
          setEmojiOpen(false);
        }}
        onClose={() => setEmojiOpen(false)}
      />

      <GameMenuModal
        visible={menuOpen}
        justSaved={justSaved}
        roomCode={online ? roomCode : null}
        onSave={handleSave}
        onRestart={handleRestart}
        onNames={!online || isHost ? handleNames : undefined}
        onRules={handleRules}
        onSettings={handleSettings}
        onExit={handleExit}
        onClose={() => setMenuOpen(false)}
      />
    </SafeAreaView>
  );
}

interface PlayerSlotProps {
  player: Player | undefined;
  side: 'left' | 'right';
  tokens: Token[];
  isCurrent: boolean;
  /** Online: shows an emoji-reaction button above this (the viewer's) panel. */
  onEmojiPress?: () => void;
  dice: ReactNode;
}

/**
 * One player's corner: their dice sits in the outer corner (shown only on their
 * turn) and their stats panel sits toward the centre. Absent players render an
 * empty placeholder so the present player stays pinned to its side.
 */
function PlayerSlot({
  player,
  side,
  tokens,
  isCurrent,
  onEmojiPress,
  dice,
}: PlayerSlotProps) {
  if (!player) return <View style={styles.slotPlaceholder} />;
  return (
    <View style={[styles.slot, side === 'left' ? styles.slotLeft : styles.slotRight]}>
      {isCurrent ? dice : <View style={styles.diceSpacer} />}
      <View style={styles.panelWrap}>
        <PlayerPanel player={player} tokens={tokens} isCurrent={isCurrent} />
        {onEmojiPress ? (
          // Absolutely positioned so it floats above the panel without changing
          // the slot's height (keeps the dice and neighbours aligned).
          <View style={styles.emojiWrap} pointerEvents="box-none">
            <Pressable style={styles.emojiBtn} onPress={onEmojiPress} hitSlop={8}>
              <Text style={styles.emojiBtnText}>🙂</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface HintInput {
  turnStatus: string;
  diceRolled: boolean;
  noMoves: boolean;
  selectedTokenId: string | null;
  isBotTurn: boolean;
  isRolling: boolean;
  name: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function buildHint({
  turnStatus,
  diceRolled,
  noMoves,
  selectedTokenId,
  isBotTurn,
  isRolling,
  name,
  t,
}: HintInput): string {
  if (turnStatus === 'finished') return t('game_over');
  if (isRolling) return t('hint_rolling');
  if (isBotTurn) return t('hint_bot_thinking', { name });
  if (noMoves) return t('hint_no_moves', { name });
  if (!diceRolled) return t('hint_roll', { name });
  if (selectedTokenId) return t('hint_tap_again');
  return t('hint_select', { name });
}

/**
 * Cheering line under the board. Always mounted and absolutely positioned, so
 * it never shifts other elements; it fades in on a new message and fades out
 * when cleared (keeping the last text on screen through the fade).
 */
function PraiseBanner({
  text,
  visible,
  flipped = false,
  raised = false,
}: {
  text: string;
  visible: boolean;
  /** Mirror copy at the top, rotated 180° so the opposite side can read it. */
  flipped?: boolean;
  /** Lift it clear of the viewer's emoji button (online, bottom copy only). */
  raised?: boolean;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 350 : 600,
    });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.praiseWrap,
        flipped ? styles.praiseTop : raised ? styles.praiseRaised : styles.praiseBottom,
        animatedStyle,
      ]}
    >
      <Text numberOfLines={2} style={styles.praise}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  play: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  sideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slot: {
    alignItems: 'center',
    gap: 8,
  },
  panelWrap: {
    position: 'relative',
  },
  emojiWrap: {
    position: 'absolute',
    top: -42,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emojiBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E88E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnText: {
    fontSize: 18,
  },
  slotLeft: {
    flexDirection: 'row',
  },
  slotRight: {
    flexDirection: 'row-reverse',
  },
  slotPlaceholder: {
    width: 1,
    height: 1,
  },
  diceSpacer: {
    width: 64,
    height: 64,
  },
  hint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
    minHeight: 20,
  },
  hintFlipped: {
    transform: [{ rotate: '180deg' }],
  },
  praiseWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  praise: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E91E63',
    textAlign: 'center',
    // Translucent pill so the line stays readable over the board and never
    // hides the emoji button it might sit near.
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  praiseBottom: {
    bottom: 2,
  },
  // Online: cleared above the viewer's emoji button (which floats ~42px up).
  praiseRaised: {
    bottom: 56,
  },
  praiseTop: {
    top: 2,
    transform: [{ rotate: '180deg' }],
  },
  pauseBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pauseCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  pauseTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  pauseBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  pauseCodeBox: {
    backgroundColor: '#E8F1FC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 2,
  },
  pauseCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E88E5',
    textTransform: 'uppercase',
  },
  pauseCode: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0D47A1',
    letterSpacing: 6,
  },
  pauseExit: {
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  pauseExitText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '700',
  },
});
