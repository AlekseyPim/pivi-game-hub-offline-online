import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { maybeShowRewardedAd, maybeShowStartRewardedAd } from "@/shared/ads/adService";
import { useAdsDisabled } from "@/shared/ads/useAdsDisabled";
import { GAME_ID } from "@/games/battleship/constants/app";
import { AdBanner } from "@/shared/components/AdBanner";
import { Board } from "@/games/battleship/components/Board";
import { EmojiModal } from "@/shared/components/EmojiModal";
import { FIREWORKS_DURATION_MS } from "@/shared/components/Fireworks";
import { FleetStatus } from "@/games/battleship/components/FleetStatus";
import { GameMenuModal } from "@/games/battleship/components/GameMenuModal";
import { GameOverModal } from "@/games/battleship/components/GameOverModal";
import { PlacementScreen } from "@/games/battleship/components/PlacementScreen";
import { SHOW_BOARD_BANNER } from "@/shared/constants/ads";
import { BOARD_SIZE, cellName, FLEET_COUNT } from "@/games/battleship/constants/board";
import { ACCENT } from "@/games/battleship/constants/colors";
import { useTheme } from "@/games/battleship/constants/theme";
import { useCyrillicBoard, useT } from "@/games/battleship/i18n/useT";
import {
  canFireAt,
  canMoveShip,
  computeResults,
  MOVE_KINDS,
  movedTo,
  type MoveKind,
} from "@/games/battleship/logic/gameReducer";
import { shipAt, shipCells } from "@/games/battleship/logic/placement";
import { useGameStore } from "@/games/battleship/store/gameStore";
import { useOnlineStore } from "@/games/battleship/store/onlineStore";
import { useSaveStore } from "@/games/battleship/store/saveStore";
import { useReactionsStore } from "@/games/battleship/store/reactionsStore";
import { useSettingsStore } from "@/shared/store/settingsStore";
import type { Ship } from "@/games/battleship/types/game";

/**
 * The battle screen. It covers the whole match: the fleet arrangement first,
 * then the duel itself — the enemy sea on top (that's what you shoot at) and
 * your own below it (that's what you manoeuvre, in movement mode).
 */

/** Arrow shown on each direction button. The words come from the dictionary. */
const MOVE_ARROW: Record<MoveKind, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

/** Gap between the lower board and the column beside it. */
const ROW_GAP = 12;
/** Padding of the frame each board sits in (`styles.boardWrap`), both sides. */
const BOARD_FRAME = 12;
/** Inner padding of the enlarged-board card. */
const CARD_PADDING = 16;

export function PlayingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const cyrillic = useCyrillicBoard();
  const { width } = useWindowDimensions();

  const game = useGameStore();
  const {
    phase,
    mode,
    online,
    boards,
    players,
    turn,
    mySlot,
    ready,
    winner,
    moveUsed,
    lastShot,
    size,
  } = game;
  const enemySlot = 1 - mySlot;

  const onlineMode = useOnlineStore((s) => s.mode);
  const opponentLost = useOnlineStore((s) => s.opponentLost);
  const sendReady = useOnlineStore((s) => s.sendReady);
  const sendShot = useOnlineStore((s) => s.sendShot);
  const sendStale = useOnlineStore((s) => s.sendStale);
  const sendEmoji = useOnlineStore((s) => s.sendEmoji);
  const rematch = useOnlineStore((s) => s.rematch);
  const leaveOnline = useOnlineStore((s) => s.leave);

  const saveGame = useSaveStore((s) => s.save);
  const playerName = useSettingsStore((s) => s.onlineName);
  const reaction = useReactionsStore((s) => s.reaction);
  const adsDisabled = useAdsDisabled();

  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  /** The summary is shown on `finished` until the player waves it away. */
  const [resultDismissed, setResultDismissed] = useState(false);
  /** A win fires the salute first; the summary waits for it to burn out. */
  const [saluteDone, setSaluteDone] = useState(false);
  /**
   * Online: our shot count at the moment we fired, so the board stays locked
   * until the opponent's answer has been folded in (which bumps that count).
   */
  const [pendingAt, setPendingAt] = useState<number | null>(null);
  /** The cell under the crosshair, waiting for the fire button. */
  const [aim, setAim] = useState<number | null>(null);
  /** Our own sea, blown up to full size for a proper look. */
  const [boardOpen, setBoardOpen] = useState(false);
  /** Manoeuvre picked but not yet confirmed — shown as a silhouette first. */
  const [plannedMove, setPlannedMove] = useState<MoveKind | null>(null);

  const myBoard = boards[mySlot];
  const enemyBoard = boards[enemySlot];
  const boardSize = size || BOARD_SIZE;

  const awaitingAnswer = pendingAt != null && game.shots[mySlot] === pendingAt;

  // Winning sets off the fireworks (see gameStore), and covering them with a
  // modal straight away would waste them — so hold the summary back for exactly
  // as long as the salute lasts. A defeat has nothing to watch, so it shows at
  // once (still through the timer, to keep this out of the effect body).
  useEffect(() => {
    if (phase !== "finished") return;
    const id = setTimeout(
      () => setSaluteDone(true),
      winner === mySlot ? FIREWORKS_DURATION_MS : 0,
    );
    return () => clearTimeout(id);
  }, [phase, winner, mySlot]);

  // A ship that is sunk (or gone) can no longer be selected for a manoeuvre.
  const selectedShip: Ship | null = useMemo(
    () => myBoard.ships.find((s) => s.id === selectedShipId && !s.sunk) ?? null,
    [myBoard.ships, selectedShipId],
  );

  const exit = () => {
    if (online) leaveOnline();
    else useGameStore.getState().resetGame();
    router.replace('/battleship');
  };

  // Leaving a running/finished battle plays a rewarded ad first (win or
  // lose) — mirrors ludo-game's handleExit / handleFinishFromGameOver. Not
  // used for backing out of placement: no battle has actually started yet.
  const exitMatch = async () => {
    await maybeShowRewardedAd(adsDisabled);
    exit();
  };

  // --- Placement ----------------------------------------------------------
  if (phase === "placement") {
    return (
      <PlacementScreen
        onBack={exit}
        waiting={ready[mySlot] && !ready[enemySlot]}
        opponentReady={online && ready[enemySlot]}
        onReady={(ships) => {
          useGameStore.getState().placeFleet(ships);
          if (online) sendReady();
          else useGameStore.getState().beginPlay(Math.random() < 0.5 ? 0 : 1);
        }}
      />
    );
  }

  // --- Battle -------------------------------------------------------------
  const myTurn = phase === "playing" && turn === mySlot;
  const canManoeuvre = mode === "moving" && myTurn && !moveUsed;
  const enemyCell = Math.floor(Math.min((width - 40) / (boardSize + 0.8), 34));
  // Below the enemy sea the row splits in two: our board on the left, the fire
  // button and the enemy's remaining fleet on the right.
  const halfWidth = Math.floor((width - 24 - ROW_GAP) / 2);
  // Less the frame the board sits in, so the left half never overruns its share.
  const myCell = Math.max(
    12,
    Math.floor((halfWidth - BOARD_FRAME) / boardSize),
  );
  // The blown-up copy fills 90% of the screen, less the card and board frames,
  // and keeps its А…К / 1…10 captions (worth about another cell of width).
  const bigCell = Math.floor(
    (width * 0.9 - CARD_PADDING * 2 - BOARD_FRAME) / (boardSize + 0.8),
  );

  // Taking aim only marks the cell; the shot itself needs the fire button. The
  // crosshair validates itself, so it disappears once the turn or the cell is
  // spent — no effect needed to clean it up.
  const aimCell =
    myTurn && aim != null && canFireAt(enemyBoard, aim) ? aim : null;
  const canFire = aimCell != null && !awaitingAnswer;

  const takeAim = (index: number) => {
    if (!myTurn || awaitingAnswer) return;
    if (!canFireAt(enemyBoard, index)) return;
    setAim(index);
  };

  const fire = () => {
    if (aimCell == null || awaitingAnswer) return;
    if (online) {
      setPendingAt(game.shots[mySlot]);
      sendShot(aimCell);
    } else {
      useGameStore.getState().shootLocal(aimCell);
    }
    setAim(null);
  };

  const pickShip = (index: number) => {
    if (!canManoeuvre) return;
    const ship = shipAt(myBoard.ships, index, boardSize);
    setSelectedShipId(ship && !ship.sunk ? ship.id : null);
  };

  // A direction only proposes the move; the silhouette shows where the ship
  // would end up and the OK button commits it.
  const planned =
    plannedMove && selectedShip && canMoveShip(myBoard, selectedShip, plannedMove, boardSize)
      ? { ship: selectedShip, ...movedTo(selectedShip, plannedMove) }
      : null;

  const manoeuvre = () => {
    if (!planned || !plannedMove) return;
    const stale = useGameStore.getState().moveMyShip(planned.ship.id, plannedMove);
    if (stale && online) sendStale(stale);
    setPlannedMove(null);
    setSelectedShipId(null);
  };

  /** Selecting another ship drops any half-made plan. */
  const selectShip = (index: number) => {
    setPlannedMove(null);
    pickShip(index);
  };

  const playAgain = async () => {
    setResultDismissed(false);
    setSaluteDone(false);
    setPendingAt(null);
    setAim(null);
    setSelectedShipId(null);
    // A rematch is a new game like any other, so it carries the same ad.
    await maybeShowStartRewardedAd(GAME_ID, adsDisabled);
    if (online) rematch();
    else useGameStore.getState().startLocal(mode, playerName);
  };

  // Lifted out so the same controls can sit under the small board and
  // inside the blown-up one, where the ships are actually legible.
  const ghost = planned
    ? {
        size: planned.ship.size,
        row: planned.row,
        col: planned.col,
        orientation: planned.ship.orientation,
        valid: true,
      }
    : null;

  const manoeuvreBar = (
    <View style={[styles.moveBar, { backgroundColor: theme.card }]}>
      <Text style={[styles.moveHint, { color: theme.textSecondary }]}>
        {!myTurn
          ? t("waiting_turn")
          : moveUsed
            ? t("already_moved")
            : planned
              ? t("move_confirm_hint")
              : selectedShip
                ? t("move_ship_hint")
                : t("select_your_ship")}
      </Text>
      <View style={styles.moveRow}>
        {MOVE_KINDS.map((kind) => {
          const enabled =
            canManoeuvre &&
            selectedShip != null &&
            canMoveShip(myBoard, selectedShip, kind, boardSize);
          const chosen = plannedMove === kind;
          return (
            <Pressable
              key={kind}
              disabled={!enabled}
              onPress={() => setPlannedMove(kind)}
              style={[
                styles.moveButton,
                chosen && styles.moveButtonChosen,
                !enabled && styles.disabled,
              ]}
            >
              <Text
                style={styles.moveButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {MOVE_ARROW[kind]} {t(`move_${kind}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* Always mounted, so the bar keeps its height while nothing is planned. */}
      <Pressable
        style={[styles.moveConfirm, !planned && styles.disabled]}
        disabled={!planned}
        onPress={manoeuvre}
      >
        <Text style={styles.moveConfirmText}>{t("move_confirm")}</Text>
      </Pressable>
    </View>
  );

  const banner =
    phase === "finished"
      ? winner === mySlot
        ? t("you_win")
        : t("you_lose")
      : myTurn
        ? t("your_turn")
        : online
          ? t("enemy_turn")
          : t("turn_of", { name: players[enemySlot]?.name || t("bot_name") });

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.iconButton}
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
        >
          <Text style={[styles.icon, { color: theme.textPrimary }]}>☰</Text>
        </Pressable>
        {/* Once the battle is over the banner reopens the summary. */}
        <Pressable
          style={styles.bannerWrap}
          disabled={phase !== "finished"}
          onPress={() => setResultDismissed(false)}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.banner,
              { color: myTurn ? ACCENT : theme.textSecondary },
            ]}
          >
            {banner}
          </Text>
        </Pressable>
        {online ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => setEmojiOpen(true)}
            hitSlop={10}
          >
            <Text style={styles.icon}>🙂</Text>
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {opponentLost ? (
        <Text style={styles.warning}>{t("opponent_left")}</Text>
      ) : null}

      {/* flex:1 — otherwise the scroller sizes to its content and runs
          underneath the ad banner pinned below it. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Enemy sea — the target. */}
        <View style={styles.boardBlock}>
          <View style={styles.boardHeader}>
            <Text style={[styles.boardTitle, { color: theme.textPrimary }]}>
              {t("enemy_fleet")}
            </Text>
            <Text style={[styles.boardMeta, { color: theme.textSecondary }]}>
              {enemyBoard.shipsLeft} / {FLEET_COUNT}
            </Text>
          </View>
          <View style={[styles.boardWrap, { backgroundColor: theme.boardBg }]}>
            <Board
              board={enemyBoard}
              size={boardSize}
              cellSize={enemyCell}
              showShips={false}
              highlight={aimCell != null ? [aimCell] : undefined}
              lastShot={lastShot[enemySlot]}
              onPressCell={takeAim}
              disabled={!myTurn || awaitingAnswer}
            />
          </View>
        </View>

        {/* Own sea on the left, what is left of the enemy fleet on the right. */}
        <View style={styles.lowerRow}>
          <View style={styles.boardBlock}>
            {/* <Text style={[styles.boardTitle, { color: theme.textPrimary }]}>
              {t('your_fleet')}
            </Text> */}
            <View
              style={[styles.boardWrap, { backgroundColor: theme.boardBg }]}
            >
              {/* Too small to play on — a tap grabs the ship and blows it up. */}
              <Board
                board={myBoard}
                size={boardSize}
                cellSize={myCell}
                showShips
                showLabels={false}
                highlight={
                  selectedShip ? shipCells(selectedShip, boardSize) : undefined
                }
                ghost={ghost}
                lastShot={lastShot[mySlot]}
                onPressCell={(index) => {
                  selectShip(index);
                  setBoardOpen(true);
                }}
              />
            </View>
            <Text style={[styles.boardTitle, { color: theme.textPrimary }]}>
              {t("your_fleet")}
            </Text>
          </View>

          <View style={[styles.rightColumn, { width: halfWidth }]}>
            {/* Always mounted, so nothing shifts when it greys out. */}
            <Pressable
              style={[styles.fireButton, !canFire && styles.disabled]}
              disabled={!canFire}
              onPress={fire}
            >
              <Text
                style={styles.fireButtonText}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {aimCell != null
                  ? `🎯  ${t("fire")}  ${cellName(aimCell, boardSize, cyrillic)}`
                  : t("select_target")}
              </Text>
            </Pressable>

            <Text style={[styles.columnTitle, { color: theme.textSecondary }]}>
              {t("ships_left")}
            </Text>
            <FleetStatus sunk={enemyBoard.ships.filter((s) => s.sunk)} />
          </View>
        </View>

        {/* Manoeuvre controls (movement mode only). */}
        {mode === "moving" ? manoeuvreBar : null}
      </ScrollView>

      {reaction ? (
        <View pointerEvents="none" style={styles.reactionWrap}>
          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          <Text style={[styles.reactionWho, { color: theme.textSecondary }]}>
            {reaction.mine ? t("you") : t("opponent")}
          </Text>
        </View>
      ) : null}

      <AdBanner enabled={SHOW_BOARD_BANNER} />

      <Modal
        visible={boardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBoardOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setBoardOpen(false)}>
          <Pressable
            style={[styles.bigCard, { backgroundColor: theme.card }]}
            onPress={() => {}}
          >
            <Text style={[styles.bigTitle, { color: theme.textPrimary }]}>
              {t("your_fleet")}
            </Text>
            <View style={[styles.boardWrap, { backgroundColor: theme.boardBg }]}>
              <Board
                board={myBoard}
                size={boardSize}
                cellSize={bigCell}
                showShips
                highlight={
                  selectedShip ? shipCells(selectedShip, boardSize) : undefined
                }
                ghost={ghost}
                lastShot={lastShot[mySlot]}
                onPressCell={selectShip}
                disabled={!canManoeuvre}
              />
            </View>
            {mode === "moving" ? manoeuvreBar : null}
            <Pressable
              style={styles.bigClose}
              onPress={() => setBoardOpen(false)}
            >
              <Text style={styles.bigCloseText}>{t("close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <GameMenuModal
        visible={menuOpen}
        canRestart={!online || onlineMode === "host"}
        canSave={!online && phase === "playing"}
        onResume={() => setMenuOpen(false)}
        onRestart={() => {
          setMenuOpen(false);
          playAgain();
        }}
        onSave={() => {
          setMenuOpen(false);
          void saveGame(useGameStore.getState()).then(() =>
            Alert.alert(t("game_saved")),
          );
        }}
        onSettings={() => {
          setMenuOpen(false);
          router.push('/battleship/settings');
        }}
        onExit={() => {
          setMenuOpen(false);
          void exitMatch();
        }}
      />

      <EmojiModal
        visible={emojiOpen}
        onPick={(emoji) => sendEmoji(emoji)}
        onClose={() => setEmojiOpen(false)}
      />

      <GameOverModal
        visible={phase === "finished" && saluteDone && !resultDismissed}
        won={winner === mySlot}
        results={computeResults(game)}
        mySlot={mySlot}
        canRestart={!online || onlineMode === "host"}
        onDismiss={() => setResultDismissed(true)}
        onPlayAgain={playAgain}
        onExit={() => void exitMatch()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22, fontWeight: "700" },
  bannerWrap: { flex: 1, alignItems: "center" },
  banner: { fontSize: 18, fontWeight: "800" },
  warning: {
    textAlign: "center",
    color: "#E53935",
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 4,
  },
  content: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  boardBlock: { alignItems: "center", gap: 6 },
  lowerRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: ROW_GAP,
  },
  rightColumn: { gap: 10 },
  // A phrase now, not a single word — uppercasing it reads badly in a narrow
  // column, and it needs room to wrap onto a second line.
  columnTitle: { fontSize: 12, fontWeight: "800" },
  boardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  boardTitle: { fontSize: 15, fontWeight: "800" },
  boardMeta: { fontSize: 13, fontWeight: "600" },
  boardWrap: { padding: 6, borderRadius: 12 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigCard: {
    width: "90%",
    borderRadius: 20,
    padding: CARD_PADDING,
    alignItems: "center",
    gap: 12,
  },
  bigTitle: { fontSize: 18, fontWeight: "800" },
  bigClose: {
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: "center",
  },
  bigCloseText: { color: ACCENT, fontSize: 16, fontWeight: "700" },
  moveBar: { alignSelf: "stretch", borderRadius: 14, padding: 10, gap: 8 },
  moveHint: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  moveRow: { flexDirection: "row", gap: 8 },
  moveButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  moveButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  moveButtonChosen: { backgroundColor: "#0D47A1", borderWidth: 2, borderColor: "#FFFFFF" },
  moveConfirm: {
    alignSelf: "stretch",
    backgroundColor: "#43A047",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  moveConfirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  fireButton: {
    alignSelf: "stretch",
    backgroundColor: "#E53935",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  fireButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.35 },
  reactionWrap: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    alignItems: "center",
  },
  reactionEmoji: { fontSize: 56 },
  reactionWho: { fontSize: 12, fontWeight: "700" },
});
