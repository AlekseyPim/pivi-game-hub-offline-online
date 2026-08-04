import {
  Canvas,
  Group,
  ImageSVG,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import {
  type BoardPalette,
  NUMBER_COLORS,
  playerColor,
} from '@/games/minesweeper/constants/colors';
import {
  FLAG_ASPECT,
  FLAG_SVG,
  QUESTION_ASPECT,
  QUESTION_SVG,
} from '@/games/minesweeper/constants/svg';
import type { Theme } from '@/games/minesweeper/constants/theme';
import type { Cell as CellModel } from '@/games/minesweeper/types/game';

/**
 * Parse the mark SVGs once (module-level — they never change). Guarded so the
 * web / static-render pass (where Skia's runtime isn't ready) can't throw.
 */
function parseSvg(xml: string) {
  try {
    return Skia.SVG.MakeFromString(xml);
  } catch {
    return null;
  }
}
const FLAG = parseSvg(FLAG_SVG);
const QUESTION = parseSvg(QUESTION_SVG);

const MINE_TILE = '#EF9A9A';
const EXPLODED_TILE = '#E53935';

/** Boards larger than this get pinch-zoom + pan; 9×9 always fits, so it stays put. */
const ZOOM_MIN_GRID = 9;
const MAX_SCALE = 4;

interface BoardProps {
  cells: CellModel[];
  gridSize: number;
  /** Square pixel box the board is drawn into (board fits it exactly at rest). */
  viewport: number;
  theme: Theme;
  /** Selected board colour palette (grid + hidden + revealed tiles). */
  palette: BoardPalette;
  mySlot: number | null;
  playerCount: number;
  reactions: Record<number, { emoji: string }>;
  onPress: (index: number) => void;
  onLongPress: (index: number) => void;
}

/**
 * Skia-rendered board. The tiles, grid and owner tints are drawn on a single
 * Skia canvas for a smooth, crisp surface; the glyphs (numbers, 💣, 🚩, ❓ and
 * emoji reactions) ride on a plain RN overlay that shares the same zoom/pan
 * transform, so text stays easy to render while the whole board scales as one.
 *
 * Input is a single gesture layer over the canvas rather than a Pressable per
 * cell: a tap/long-press is hit-tested back to a cell index through the inverse
 * of the pan/zoom transform, and (for boards > 9×9) pinch zooms and drag pans.
 */
export function Board({
  cells,
  gridSize,
  viewport,
  theme,
  palette,
  mySlot,
  playerCount,
  reactions,
  onPress,
  onLongPress,
}: BoardProps) {
  const cellPx = viewport / gridSize;
  // Gap = the visible grid line between tiles. Fixed 1px on every board size.
  const gap = 1;
  // Square tiles (no rounding) for a classic, crisp minesweeper grid.
  const radius = 0;
  const multiplayer = playerCount > 1;
  const zoomable = gridSize > ZOOM_MIN_GRID;

  // Pan/zoom transform, shared with both the Skia group and the RN overlay so
  // they stay pixel-aligned. content → screen: p' = translate + scale · p.
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  // The transform starts at identity and, for a 9×9, has no gestures to move it.
  // A change of board size remounts this component (keyed on size upstream), so
  // switching between sizes always begins un-zoomed.

  const canvasTransform = useDerivedValue(() => [
    { translateX: tx.get() },
    { translateY: ty.get() },
    { scale: scale.get() },
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { scale: scale.get() },
    ],
  }));

  const gesture = useMemo(() => {
    const hitTest = (sx: number, sy: number) => {
      'worklet';
      const cx = (sx - tx.get()) / scale.get();
      const cy = (sy - ty.get()) / scale.get();
      const col = Math.floor(cx / cellPx);
      const row = Math.floor(cy / cellPx);
      if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) return -1;
      return row * gridSize + col;
    };

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((e, success) => {
        'worklet';
        if (!success) return;
        const idx = hitTest(e.x, e.y);
        if (idx >= 0) runOnJS(onPress)(idx);
      });

    const longPress = Gesture.LongPress()
      .minDuration(220)
      .maxDistance(12)
      .onStart((e) => {
        'worklet';
        const idx = hitTest(e.x, e.y);
        if (idx >= 0) runOnJS(onLongPress)(idx);
      });

    const taps = Gesture.Exclusive(longPress, tap);
    if (!zoomable) return taps;

    const clampPan = () => {
      'worklet';
      const minT = viewport - scale.get() * viewport; // ≤ 0
      if (tx.get() > 0) tx.set(0);
      else if (tx.get() < minT) tx.set(minT);
      if (ty.get() > 0) ty.set(0);
      else if (ty.get() < minT) ty.set(minT);
    };

    const pan = Gesture.Pan()
      .minDistance(2)
      .onStart(() => {
        'worklet';
        startTx.set(tx.get());
        startTy.set(ty.get());
      })
      .onUpdate((e) => {
        'worklet';
        tx.set(startTx.get() + e.translationX);
        ty.set(startTy.get() + e.translationY);
        clampPan();
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        startScale.set(scale.get());
      })
      .onUpdate((e) => {
        'worklet';
        let ns = startScale.get() * e.scale;
        if (ns < 1) ns = 1;
        else if (ns > MAX_SCALE) ns = MAX_SCALE;
        // Keep the point under the pinch focal fixed while zooming.
        const cx = (e.focalX - tx.get()) / scale.get();
        const cy = (e.focalY - ty.get()) / scale.get();
        tx.set(e.focalX - cx * ns);
        ty.set(e.focalY - cy * ns);
        scale.set(ns);
        clampPan();
      });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), taps);
  }, [
    zoomable,
    cellPx,
    gridSize,
    viewport,
    onPress,
    onLongPress,
    scale,
    tx,
    ty,
    startScale,
    startTx,
    startTy,
  ]);

  // Button-driven zoom (a reliable companion to pinch, and the only way to zoom
  // on a device/simulator where a two-finger pinch isn't available). Scales
  // around the board centre and re-clamps the pan the same way the gestures do.
  const zoomBy = useCallback(
    (factor: number) => {
      const cur = scale.get();
      let ns = cur * factor;
      if (ns < 1) ns = 1;
      else if (ns > MAX_SCALE) ns = MAX_SCALE;
      const c = viewport / 2;
      const cx = (c - tx.get()) / cur;
      const cy = (c - ty.get()) / cur;
      const minT = viewport - ns * viewport; // ≤ 0
      scale.set(ns);
      tx.set(Math.min(0, Math.max(minT, c - cx * ns)));
      ty.set(Math.min(0, Math.max(minT, c - cy * ns)));
    },
    [scale, tx, ty, viewport],
  );

  const resetZoom = useCallback(() => {
    scale.set(1);
    tx.set(0);
    ty.set(0);
  }, [scale, tx, ty]);

  // Glyphs to overlay — only the cells that actually show something.
  const glyphs = useMemo(() => {
    const out: {
      index: number;
      left: number;
      top: number;
      text: string;
      color: string;
      fontSize: number;
    }[] = [];
    for (const cell of cells) {
      const left = cell.col * cellPx;
      const top = cell.row * cellPx;
      let text: string | null = null;
      let color = theme.textPrimary;
      let fontSize = cellPx * 0.6;
      if (cell.state === 'revealed') {
        if (cell.mine) {
          text = '💣';
          fontSize = cellPx * 0.52;
        } else if (cell.adjacent > 0) {
          text = String(cell.adjacent);
          color = NUMBER_COLORS[cell.adjacent];
          fontSize = cellPx * 0.6;
        }
      } else if (cell.mark === 'flag' && !FLAG) {
        text = '🚩'; // emoji fallback if the SVG failed to parse
      } else if (cell.mark === 'question' && !QUESTION) {
        text = '❓';
      }
      // Flag / question marks are drawn as SVGs on the Skia layer (above); the
      // branches here only fire as a fallback when the SVG couldn't be parsed.
      // A live emoji reaction wins the cell (pinned to it while it lasts).
      const reaction = reactions[cell.index]?.emoji;
      if (reaction) {
        text = reaction;
        fontSize = cellPx * 0.7;
      }
      if (text != null) out.push({ index: cell.index, left, top, text, color, fontSize });
    }
    return out;
  }, [cells, reactions, cellPx, theme.textPrimary]);

  return (
    <View style={{ width: viewport, alignItems: 'center' }}>
      <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.container,
          { width: viewport, height: viewport, backgroundColor: palette.grid },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group transform={canvasTransform}>
            <Rect x={0} y={0} width={viewport} height={viewport} color={palette.grid} />
            {cells.map((cell) => (
              <Tile
                key={cell.index}
                cell={cell}
                cellPx={cellPx}
                gap={gap}
                radius={radius}
                theme={theme}
                palette={palette}
                mySlot={mySlot}
                multiplayer={multiplayer}
              />
            ))}
            {cells.map((cell) => {
              // Flag / question marks as SVGs (skip if a reaction owns the cell).
              if (
                cell.state !== 'hidden' ||
                (cell.mark !== 'flag' && cell.mark !== 'question') ||
                reactions[cell.index]
              ) {
                return null;
              }
              const svg = cell.mark === 'flag' ? FLAG : QUESTION;
              if (!svg) return null;
              const box = cellPx * 0.7;
              const w = box;
              const h = box * (cell.mark === 'flag' ? FLAG_ASPECT : QUESTION_ASPECT);
              const mx = cell.col * cellPx + (cellPx - w) / 2;
              const my = cell.row * cellPx + (cellPx - h) / 2;
              return (
                <ImageSVG
                  key={`mark-${cell.index}`}
                  svg={svg}
                  x={mx}
                  y={my}
                  width={w}
                  height={h}
                />
              );
            })}
          </Group>
        </Canvas>

        <Animated.View
          style={[styles.overlay, { width: viewport, height: viewport }, overlayStyle]}
          pointerEvents="none"
        >
          {glyphs.map((g) => (
            <View
              key={g.index}
              style={[
                styles.glyphBox,
                { left: g.left, top: g.top, width: cellPx, height: cellPx },
              ]}
            >
              <Text
                style={{
                  fontSize: g.fontSize,
                  fontWeight: '800',
                  color: g.color,
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {g.text}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
      </GestureDetector>

      {zoomable ? (
        <View style={styles.zoomControls}>
          <ZoomButton label="–" theme={theme} onPress={() => zoomBy(1 / 1.6)} />
          <ZoomButton label="⟲" theme={theme} onPress={resetZoom} />
          <ZoomButton label="+" theme={theme} onPress={() => zoomBy(1.6)} />
        </View>
      ) : null}
    </View>
  );
}

/** One button in the zoom bar shown beneath boards larger than 9×9. */
function ZoomButton({
  label,
  theme,
  onPress,
}: {
  label: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.zoomButton,
        {
          backgroundColor: theme.dark ? '#37474F' : '#FFFFFF',
          borderColor: theme.boardGrid,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.zoomButtonText, { color: theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

/** One Skia tile: rounded fill by state, plus owner tint / foreign scrim. */
function Tile({
  cell,
  cellPx,
  gap,
  radius,
  theme,
  palette,
  mySlot,
  multiplayer,
}: {
  cell: CellModel;
  cellPx: number;
  gap: number;
  radius: number;
  theme: Theme;
  palette: BoardPalette;
  mySlot: number | null;
  multiplayer: boolean;
}) {
  const x = cell.col * cellPx + gap;
  const y = cell.row * cellPx + gap;
  const s = cellPx - gap * 2;

  let fill: string;
  if (cell.state === 'revealed') {
    fill = cell.mine ? (cell.exploded ? EXPLODED_TILE : MINE_TILE) : palette.revealed;
  } else {
    fill = palette.hidden;
  }

  const hiddenForeign =
    cell.state === 'hidden' && multiplayer && mySlot != null && cell.owner !== mySlot;

  return (
    <Group>
      <RoundedRect x={x} y={y} width={s} height={s} r={radius} color={fill} />
      {cell.state === 'hidden' && multiplayer ? (
        <RoundedRect
          x={x}
          y={y}
          width={s}
          height={Math.max(3, cellPx * 0.14)}
          r={radius}
          color={playerColor(cell.owner)}
        />
      ) : null}
      {hiddenForeign ? (
        <RoundedRect
          x={x}
          y={y}
          width={s}
          height={s}
          r={radius}
          color={theme.dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.45)'}
        />
      ) : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0% 0%',
  },
  glyphBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  zoomButton: {
    width: 44,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
    includeFontPadding: false,
  },
});
