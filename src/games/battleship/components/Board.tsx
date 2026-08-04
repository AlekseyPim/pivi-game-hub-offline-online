import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colOf, columnLabels, idx, rowOf } from '@/games/battleship/constants/board';
import {
  boardPalette,
  HIT_COLOR,
  HIT_STALE_OPACITY,
  LAST_SHOT_COLOR,
  MISS_COLOR,
  SUNK_COLOR,
} from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { useCyrillicBoard } from '@/games/battleship/i18n/useT';
import { usePrefsStore } from '@/games/battleship/store/prefsStore';
import type { Board as BoardModel, Orientation, Ship } from '@/games/battleship/types/game';

/**
 * One sea, drawn in four stacked layers so touches always land on the water:
 *
 *   1. the water grid (the only interactive layer),
 *   2. hulls — your own fleet, or the enemy wrecks you have already revealed,
 *   3. shot markers — misses, hits, dimmed hits and wrecks,
 *   4. transient overlays — the ship being positioned (a translucent
 *      silhouette), the selected ship and the last impact.
 *
 * A dimmed hit (`hitStale`, 0.4 opacity) is the movement mode's signature: the
 * marker stays where the shot landed even after the ship has sailed on.
 */

interface BoardProps {
  board: BoardModel;
  size: number;
  cellSize: number;
  /** Draw the hulls. True for your own sea, false behind the enemy's fog. */
  showShips: boolean;
  /** Cells to outline — a placement preview or the selected ship. */
  highlight?: number[];
  /** Colours the highlight green (legal) or red (illegal). */
  highlightValid?: boolean;
  /**
   * A ship being positioned but not yet confirmed, drawn as a translucent
   * silhouette outlined green (legal berth) or red (illegal).
   */
  ghost?: {
    size: number;
    row: number;
    col: number;
    orientation: Orientation;
    valid: boolean;
  } | null;
  /** Cell to ring as the most recent impact. */
  lastShot?: number | null;
  onPressCell?: (index: number) => void;
  /**
   * Enables dragging: the finger going down reports through `onPressCell` and
   * every move through this, so a ship can be grabbed and towed in one motion.
   * Cells outside the grid are clamped to the edge, so the drag never escapes.
   */
  onDragCell?: (index: number) => void;
  disabled?: boolean;
  /** Draw the А…К / 1…10 captions around the grid. */
  showLabels?: boolean;
}

export const Board = memo(function Board({
  board,
  size,
  cellSize,
  showShips,
  highlight,
  highlightValid = true,
  ghost,
  lastShot,
  onPressCell,
  onDragCell,
  disabled = false,
  showLabels = true,
}: BoardProps) {
  const theme = useTheme();
  const palette = boardPalette(usePrefsStore((s) => s.boardTheme));
  const labels = columnLabels(useCyrillicBoard());
  const side = cellSize * size;
  const gutter = showLabels ? Math.max(14, cellSize * 0.62) : 0;
  const highlightSet = new Set(highlight ?? []);
  const draggable = onDragCell != null && !disabled;

  // One pan drives both: touch-down positions (or picks up) the ship, every
  // subsequent move tows it. Rebuilt only when the geometry or the handlers
  // change — never mid-drag, since the handlers don't close over the ship.
  const pan = useMemo(() => {
    const at = (x: number, y: number) => {
      const c = Math.min(size - 1, Math.max(0, Math.floor(x / cellSize)));
      const r = Math.min(size - 1, Math.max(0, Math.floor(y / cellSize)));
      return idx(r, c, size);
    };
    return Gesture.Pan()
      .enabled(draggable)
      // The handlers are plain React state setters, not worklets — without this
      // Reanimated tries to run them on the UI runtime and throws.
      .runOnJS(true)
      .onBegin((e) => onPressCell?.(at(e.x, e.y)))
      .onUpdate((e) => onDragCell?.(at(e.x, e.y)));
  }, [draggable, onPressCell, onDragCell, cellSize, size]);

  // Own fleet is always drawn; an enemy sea shows only the wrecks we uncovered.
  const visibleShips: Ship[] = showShips
    ? board.ships
    : board.ships.filter((ship) => ship.sunk);

  return (
    <View style={{ paddingLeft: gutter, paddingTop: gutter }}>
      {showLabels ? (
        <>
          <View style={[styles.labelRow, { left: gutter, top: 0, height: gutter }]}>
            {labels.slice(0, size).map((label) => (
              <View key={label} style={{ width: cellSize, alignItems: 'center' }}>
                <Text
                  style={[styles.label, { color: theme.textSecondary, fontSize: cellSize * 0.42 }]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.labelCol, { top: gutter, left: 0, width: gutter }]}>
            {Array.from({ length: size }, (_, r) => (
              <View key={r} style={{ height: cellSize, justifyContent: 'center' }}>
                <Text
                  style={[styles.label, { color: theme.textSecondary, fontSize: cellSize * 0.42 }]}
                >
                  {r + 1}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <MaybeDraggable enabled={draggable} gesture={pan}>
      <View style={{ width: side, height: side }}>
        {/* 1 — the water, and the only thing you can touch. */}
        <View style={[styles.grid, { width: side, height: side }]}>
          {board.marks.map((_, index) => (
            <Pressable
              key={index}
              disabled={disabled || !onPressCell || draggable}
              onPress={() => onPressCell?.(index)}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: palette.water,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: palette.grid,
              }}
            />
          ))}
        </View>

        {/* 2 — hulls. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {visibleShips.map((ship) => {
            const damaged = ship.hits.some(Boolean);
            const width = (ship.orientation === 'h' ? ship.size : 1) * cellSize;
            const height = (ship.orientation === 'v' ? ship.size : 1) * cellSize;
            return (
              <View
                key={ship.id}
                style={[
                  styles.hull,
                  {
                    left: ship.col * cellSize,
                    top: ship.row * cellSize,
                    width,
                    height,
                    borderRadius: Math.min(cellSize * 0.35, 10),
                    backgroundColor: ship.sunk
                      ? SUNK_COLOR
                      : damaged
                        ? palette.shipDamaged
                        : palette.ship,
                    opacity: ship.sunk ? 0.85 : 1,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* 3 — shot markers. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {board.marks.map((mark, index) =>
            mark === 'none' ? null : (
              <Marker
                key={index}
                mark={mark}
                cellSize={cellSize}
                left={colOf(index, size) * cellSize}
                top={rowOf(index, size) * cellSize}
              />
            ),
          )}
        </View>

        {/* 4 — highlights. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {[...highlightSet].map((index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: colOf(index, size) * cellSize,
                top: rowOf(index, size) * cellSize,
                width: cellSize,
                height: cellSize,
                borderWidth: 2.5,
                borderRadius: 4,
                borderColor: highlightValid ? '#43A047' : '#E53935',
                backgroundColor: highlightValid
                  ? 'rgba(67,160,71,0.25)'
                  : 'rgba(229,57,53,0.25)',
              }}
            />
          ))}
          {ghost ? (
            <View
              style={[
                styles.ghost,
                {
                  left: ghost.col * cellSize,
                  top: ghost.row * cellSize,
                  width: (ghost.orientation === 'h' ? ghost.size : 1) * cellSize,
                  height: (ghost.orientation === 'v' ? ghost.size : 1) * cellSize,
                  borderRadius: Math.min(cellSize * 0.35, 10),
                  borderColor: ghost.valid ? '#43A047' : '#E53935',
                },
              ]}
            >
              {/* Fill is faded on its own so the outline stays crisp. */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: palette.ship, opacity: 0.45 },
                ]}
              />
            </View>
          ) : null}
          {lastShot != null ? (
            <View
              style={{
                position: 'absolute',
                left: colOf(lastShot, size) * cellSize,
                top: rowOf(lastShot, size) * cellSize,
                width: cellSize,
                height: cellSize,
                borderWidth: 2,
                borderRadius: 3,
                borderColor: LAST_SHOT_COLOR,
              }}
            />
          ) : null}
        </View>
      </View>
      </MaybeDraggable>
    </View>
  );
});

/** Wraps the grid in a pan detector only where dragging is actually wanted. */
function MaybeDraggable({
  enabled,
  gesture,
  children,
}: {
  enabled: boolean;
  gesture: ReturnType<typeof Gesture.Pan>;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}

/** One shot marker: a splash for a miss, a cross for a hit, dimmed if stale. */
function Marker({
  mark,
  cellSize,
  left,
  top,
}: {
  mark: 'miss' | 'hit' | 'hitStale' | 'sunk';
  cellSize: number;
  left: number;
  top: number;
}) {
  const box = {
    position: 'absolute' as const,
    left,
    top,
    width: cellSize,
    height: cellSize,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (mark === 'miss') {
    const dot = Math.max(5, cellSize * 0.34);
    return (
      <View style={box}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: MISS_COLOR,
          }}
        />
      </View>
    );
  }

  const color = mark === 'sunk' ? '#FFFFFF' : HIT_COLOR;
  const bar = {
    position: 'absolute' as const,
    width: cellSize * 0.68,
    height: Math.max(2, cellSize * 0.13),
    borderRadius: 2,
    backgroundColor: color,
  };
  return (
    <View style={[box, mark === 'hitStale' && { opacity: HIT_STALE_OPACITY }]}>
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hull: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.35)' },
  ghost: { position: 'absolute', borderWidth: 3, overflow: 'hidden' },
  labelRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  labelCol: { position: 'absolute' },
  label: { fontWeight: '700', textAlign: 'center' },
});
