import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/shared/components/AdBanner';
import { Board } from '@/games/battleship/components/Board';
import { SHOW_PLACEMENT_BANNER } from '@/shared/constants/ads';
import { BOARD_SIZE, colOf, rowOf } from '@/games/battleship/constants/board';
import { ACCENT, boardPalette } from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { useT } from '@/games/battleship/i18n/useT';
import {
  canPlace,
  emptyBoard,
  makeShip,
  randomFleet,
  remainingFleet,
  shipAt,
} from '@/games/battleship/logic/placement';
import { useGameStore } from '@/games/battleship/store/gameStore';
import { usePrefsStore } from '@/games/battleship/store/prefsStore';
import { useSetupStore } from '@/games/battleship/store/setupStore';
import type { Orientation, Ship } from '@/games/battleship/types/game';

/**
 * Fleet arrangement, shown before every battle (local and online alike).
 *
 * Placing a ship takes two steps: put a finger on the sea and the ship appears
 * as a translucent silhouette — green where it may berth, red where it may not
 * — which can be towed around while the finger is down, spun with `⟳`, and is
 * only committed by "Confirm". Grabbing a berthed ship lifts it back off the
 * board in the same motion; `🎲` arranges the whole fleet at random.
 *
 * The confirm button is always mounted — greyed out when there is nothing to
 * confirm — so the board never jumps as it comes and goes.
 *
 * The arrangement never leaves the device until the player confirms — and
 * online it never leaves at all, only a "ready" flag.
 */

interface PlacementScreenProps {
  /** Called once the fleet is confirmed; the caller starts the battle. */
  onReady: (ships: Ship[]) => void;
  /** Online: the opponent has already arranged their fleet. */
  opponentReady?: boolean;
  /** Online: we confirmed and are waiting for the opponent. */
  waiting?: boolean;
  onBack: () => void;
}

export function PlacementScreen({
  onReady,
  opponentReady = false,
  waiting = false,
  onBack,
}: PlacementScreenProps) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const palette = boardPalette(usePrefsStore((s) => s.boardTheme));
  const autoPlace = useSetupStore((s) => s.autoPlace);
  const size = useGameStore((s) => s.size) || BOARD_SIZE;

  const [ships, setShips] = useState<Ship[]>(() => (autoPlace ? randomFleet(size) : []));
  const [orientation, setOrientation] = useState<Orientation>('h');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  /** The ship being positioned: its bow cell, awaiting confirmation. */
  const [pending, setPending] = useState<{ size: number; row: number; col: number } | null>(
    null,
  );

  const left = useMemo(() => remainingFleet(ships), [ships]);
  const complete = left.length === 0;

  // The selection follows the dock: if the chosen size ran out (or nothing was
  // chosen yet), fall back to the biggest ship still waiting.
  const activeSize =
    selectedSize != null && left.includes(selectedSize) ? selectedSize : (left[0] ?? null);

  /** Keep a bow on the board, so the silhouette is always drawn in full. */
  const clampBow = (shipSize: number, row: number, col: number, o: Orientation) => ({
    row: o === 'v' ? Math.min(row, size - shipSize) : row,
    col: o === 'h' ? Math.min(col, size - shipSize) : col,
  });

  // The silhouette follows the current heading, so `⟳` spins it on the spot.
  const ghostAt = pending ? clampBow(pending.size, pending.row, pending.col, orientation) : null;
  const ghostValid =
    ghostAt != null &&
    pending != null &&
    canPlace(ships, pending.size, ghostAt.row, ghostAt.col, orientation, size);

  const confirmPlacement = () => {
    if (!pending || !ghostAt || !ghostValid) return;
    setShips((prev) => [...prev, makeShip(pending.size, ghostAt.row, ghostAt.col, orientation)]);
    setPending(null);
  };

  const board = useMemo(
    () => ({ ...emptyBoard(size), ships, shipsLeft: ships.length }),
    [ships, size],
  );

  const cellSize = Math.floor(Math.min((width - 56) / size, 34));

  /** Finger down: lift a berthed ship off the board, or start a new silhouette. */
  const onPressCell = useCallback(
    (index: number) => {
      if (waiting) return;
      const existing = shipAt(ships, index, size);
      if (existing) {
        setShips((prev) => prev.filter((s) => s.id !== existing.id));
        setSelectedSize(existing.size);
        setPending({ size: existing.size, row: existing.row, col: existing.col });
        return;
      }
      if (activeSize == null) return;
      // Nothing is committed yet — the silhouette waits for "Confirm".
      setPending({ size: activeSize, row: rowOf(index, size), col: colOf(index, size) });
    },
    [waiting, ships, size, activeSize],
  );

  /** Finger moving: tow the silhouette. Functional update, so no stale closure. */
  const onDragCell = useCallback(
    (index: number) => {
      if (waiting) return;
      const row = rowOf(index, size);
      const col = colOf(index, size);
      setPending((prev) => (prev ? { ...prev, row, col } : prev));
    },
    [waiting, size],
  );

  const groups = [4, 3, 2, 1].map((shipSize) => ({
    size: shipSize,
    count: left.filter((s) => s === shipSize).length,
  }));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('placement_title')}
        </Text>
      </View>

      {/* flex:1 — otherwise the scroller sizes to its content and runs
          underneath the ad banner pinned below it. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          {waiting ? t('opponent_placing') : t('placement_hint')}
        </Text>

        <View style={[styles.boardWrap, { backgroundColor: theme.boardBg }]}>
          <Board
            board={board}
            size={size}
            cellSize={cellSize}
            showShips
            ghost={
              ghostAt && pending
                ? {
                    size: pending.size,
                    row: ghostAt.row,
                    col: ghostAt.col,
                    orientation,
                    valid: ghostValid,
                  }
                : null
            }
            onPressCell={onPressCell}
            onDragCell={onDragCell}
            disabled={waiting}
          />
        </View>

        {/* The dock: what is still waiting to be berthed. */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {t('fleet_left')}
        </Text>
        <View style={styles.dock}>
          {groups.map((group) => {
            const active = activeSize === group.size && group.count > 0;
            const spent = group.count === 0;
            return (
              <Pressable
                key={group.size}
                disabled={spent || waiting}
                onPress={() => {
                  setSelectedSize(group.size);
                  setPending((p) => (p ? { ...p, size: group.size } : null));
                }}
                style={[
                  styles.dockItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: active ? ACCENT : 'transparent',
                    opacity: spent ? 0.35 : 1,
                  },
                ]}
              >
                <View style={styles.dockShip}>
                  {Array.from({ length: group.size }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.dockDeck, { backgroundColor: palette.ship }]}
                    />
                  ))}
                </View>
                <Text style={[styles.dockCount, { color: theme.textPrimary }]}>
                  ×{group.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toolRow}>
          <Pressable
            style={[styles.tool, { borderColor: ACCENT }]}
            disabled={waiting}
            onPress={() => setOrientation((o) => (o === 'h' ? 'v' : 'h'))}
          >
            {/* U+FE0E keeps the arrows as text glyphs instead of emoji. */}
            <Text style={styles.toolText} numberOfLines={1} adjustsFontSizeToFit>
              {t('rotate')} {orientation === 'h' ? '\u2194\uFE0E' : '\u2195\uFE0E'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tool, { borderColor: ACCENT }]}
            disabled={waiting}
            onPress={() => {
              setPending(null);
              setShips(randomFleet(size));
            }}
          >
            <Text style={styles.toolText} numberOfLines={1} adjustsFontSizeToFit>
              {t('auto_place')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tool, { borderColor: ACCENT }]}
            disabled={waiting}
            onPress={() => {
              setPending(null);
              setShips([]);
            }}
          >
            <Text style={styles.toolText} numberOfLines={1} adjustsFontSizeToFit>
              {t('clear_board')}
            </Text>
          </Pressable>
        </View>

        {/* Always mounted, so the board never shifts when it greys out. */}
        <Pressable
          style={[styles.confirmButton, !(ghostValid && !waiting) && styles.disabled]}
          disabled={!ghostValid || waiting}
          onPress={confirmPlacement}
        >
          <Text style={styles.confirmButtonText}>
            {pending && !ghostValid ? t('confirm_blocked') : t('confirm_placement')}
          </Text>
        </Pressable>

        {waiting ? (
          <Text style={[styles.waiting, { color: theme.textSecondary }]}>
            {t('waiting_opponent')}
          </Text>
        ) : (
          <Pressable
            style={[styles.primaryButton, !complete && styles.disabled]}
            disabled={!complete}
            onPress={() => onReady(ships)}
          >
            <Text style={styles.primaryButtonText}>
              {complete ? t('ready_to_battle') : t('placement_incomplete')}
            </Text>
          </Pressable>
        )}

        {opponentReady && !waiting ? (
          <Text style={[styles.waiting, { color: theme.textSecondary }]}>
            {t('waiting_turn')}
          </Text>
        ) : null}
      </ScrollView>

      <AdBanner enabled={SHOW_PLACEMENT_BANNER} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  hint: { fontSize: 14, textAlign: 'center', lineHeight: 19 },
  boardWrap: { padding: 8, borderRadius: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  dock: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  dockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  dockShip: { flexDirection: 'row', gap: 2 },
  dockDeck: { width: 12, height: 12, borderRadius: 3 },
  dockCount: { fontSize: 14, fontWeight: '800' },
  toolRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  tool: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  toolText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  confirmButton: {
    alignSelf: 'stretch',
    backgroundColor: '#43A047',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: ACCENT,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  waiting: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
