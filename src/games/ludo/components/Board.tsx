import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Cell } from '@/games/ludo/components/Cell';
import { Token } from '@/games/ludo/components/Token';
import { TOKEN_SCALE } from '@/games/ludo/constants/animation';
import {
  BASE_CELL_RATIO,
  BASE_ORIGIN_BY_COLOR,
  BASE_SLOTS_BY_COLOR,
  COLOR_ORDER,
  CORRIDOR_MAX,
  CORRIDOR_MIN,
  HOME_PATH_BY_COLOR,
} from '@/games/ludo/constants/board';
import {
  BOARD_BACKGROUND,
  COLOR_DARK,
  COLOR_HEX,
  GRID_LINE,
} from '@/games/ludo/constants/colors';
import { tokenFaceFor, type TokenFace } from '@/games/ludo/constants/tokenImages';
import { buildBoardCells, coordForToken } from '@/games/ludo/logic/boardPath';
import { emojiForName } from '@/games/ludo/logic/nameEmoji';
import { useReactionsStore } from '@/games/ludo/store/reactionsStore';
import {
  axisPos,
  buildLayout,
  cellRect,
  centerOf,
  extentAt,
  type BoardLayout,
} from '@/games/ludo/logic/layout';
import type {
  Coord,
  Player,
  PlayerColor,
  Token as TokenModel,
} from '@/games/ludo/types/game';

interface BoardProps {
  tokens: TokenModel[];
  /** Players in the match, used to label each base with its owner's name. */
  players: Player[];
  /** Total board size in pixels (square). */
  boardSize: number;
  movableTokenIds: string[];
  /** Whether this device may tap movable tokens (observers see them but can't). */
  interactive: boolean;
  selectedTokenId: string | null;
  /** Cells of the pending move to highlight, in travel order. */
  highlightCells: Coord[];
  /** Colour used to paint the move highlight (current player). */
  highlightColor: PlayerColor;
  /** Colour whose base should pulse (a 6 can bring a token out), or null. */
  pulseBaseColor: PlayerColor | null;
  /** Whose turn it is — their tokens come to the front of any shared cell. */
  currentColor: PlayerColor | null;
  /** Finishing order; a colour here shows its place badge instead of its yard. */
  rankings: PlayerColor[];
  onTokenPress: (tokenId: string) => void;
  /** Opens the in-game menu (rendered as a button in the board centre). */
  onMenuPress: () => void;
  /**
   * Quarter-turns (clockwise) to rotate the whole board by, so a single viewer's
   * own colour sits at the bottom-right. Base names are hidden and place badges /
   * the menu icon are counter-rotated to stay upright. 0 = standard orientation.
   */
  rotationSteps?: number;
}

interface StackInfo {
  index: number;
  count: number;
}

/**
 * Group tokens that share a grid cell so they can be fanned. The current
 * player's tokens are ordered first, so they take the front fan slots and sit
 * on top (see `elevated` on Token) — making them visible and tappable even when
 * opponents share the square.
 */
function computeStacks(
  tokens: TokenModel[],
  currentColor: PlayerColor | null,
): Map<string, StackInfo> {
  const groups = new Map<string, TokenModel[]>();
  for (const token of tokens) {
    const coord = coordForToken(token);
    const key = `${coord.row}-${coord.col}`;
    const list = groups.get(key) ?? [];
    list.push(token);
    groups.set(key, list);
  }

  const result = new Map<string, StackInfo>();
  for (const list of groups.values()) {
    // Stable sort: current player's tokens first, others keep their order.
    const ordered = [...list].sort(
      (a, b) =>
        (a.color === currentColor ? 0 : 1) - (b.color === currentColor ? 0 : 1),
    );
    ordered.forEach((token, index) => {
      result.set(token.id, { index, count: ordered.length });
    });
  }
  return result;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** A compact white yard with four resting circles for a colour's base. */
function BaseYard({
  color,
  layout,
  isPulsing,
  place,
  counterDeg,
}: {
  color: PlayerColor;
  layout: BoardLayout;
  /** True when a 6 lets this colour bring a token out — pulses the yard border. */
  isPulsing: boolean;
  /** Finishing place (1-based) once this player is home, else null. */
  place: number | null;
  /** Degrees to counter-rotate the place badge so it stays upright. */
  counterDeg: number;
}) {
  const origin = BASE_ORIGIN_BY_COLOR[color];
  const left = axisPos(layout, origin.col + 1.05);
  const top = axisPos(layout, origin.row + 1.05);
  const right = axisPos(layout, origin.col + 4.95);
  const bottom = axisPos(layout, origin.row + 4.95);
  const baseCell = extentAt(layout, origin.row, origin.col);
  const baseBorder = Math.max(2, baseCell * 0.14);

  const borderWidth = useSharedValue(baseBorder);
  useEffect(() => {
    if (isPulsing) {
      borderWidth.value = withRepeat(
        withSequence(
          withTiming(baseBorder * 2, { duration: 480 }),
          withTiming(baseBorder, { duration: 480 }),
        ),
        -1,
        true,
      );
    } else {
      borderWidth.value = withTiming(baseBorder, { duration: 200 });
    }
  }, [isPulsing, baseBorder, borderWidth]);

  const animatedBorder = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
  }));

  // Finished: show the place number + medal instead of the empty yard.
  if (place != null) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.placeBadge,
          {
            left,
            top,
            width: right - left,
            height: bottom - top,
            transform: [{ rotate: `${counterDeg}deg` }],
          },
        ]}
      >
        <Text
          style={[
            styles.placeNumber,
            { color: COLOR_DARK[color], fontSize: baseCell * 1.9 },
          ]}
        >
          {place}
        </Text>
        {MEDALS[place - 1] ? (
          <Text style={{ fontSize: baseCell * 1.3 }}>{MEDALS[place - 1]}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Animated.View
        style={[
          styles.yard,
          {
            left,
            top,
            width: right - left,
            height: bottom - top,
            borderRadius: baseCell,
            borderColor: COLOR_HEX[color],
          },
          animatedBorder,
        ]}
      />
      {BASE_SLOTS_BY_COLOR[color].map((slot, i) => {
        const center = centerOf(layout, slot.row, slot.col);
        const size = baseCell * TOKEN_SCALE * 0.94;
        return (
          <View
            key={`${color}-slot-${i}`}
            style={[
              styles.slot,
              {
                left: center.x - size / 2,
                top: center.y - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: COLOR_DARK[color],
              },
            ]}
          />
        );
      })}
    </>
  );
}

/**
 * The owner's name pinned to the outer edge of their base corner — a horizontal
 * band hugging the top edge for the two top bases and the bottom edge for the
 * two bottom bases, just outside the yard.
 */
function BaseName({
  color,
  name,
  layout,
}: {
  color: PlayerColor;
  name: string;
  layout: BoardLayout;
}) {
  const origin = BASE_ORIGIN_BY_COLOR[color];
  const isTop = origin.row < 7;
  const left = layout.edges[origin.col];
  const width = layout.edges[origin.col + 6] - left;
  // Outer strip between the board edge and the yard; the pill hugs the edge.
  const stripHeight = layout.sizes[origin.row] * 1.7;
  const top = isTop
    ? layout.edges[origin.row]
    : layout.edges[origin.row + 6] - stripHeight;
  const fontSize = Math.max(11, layout.size * 0.03);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.baseName,
        {
          left,
          top,
          width,
          height: stripHeight,
          justifyContent: isTop ? 'flex-start' : 'flex-end',
        },
      ]}
    >
      <View style={[styles.baseNamePill, { borderColor: COLOR_HEX[color] }]}>
        <Text
          numberOfLines={1}
          style={[styles.baseNameText, { color: COLOR_DARK[color], fontSize }]}
        >
          {name}
          {emojiForName(name) ? (
            <Text style={{ fontSize: fontSize * 1.35 }}>
              {' '}
              {emojiForName(name)}
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

/** A pulsing ring marking a cell on the previewed move path. */
function MoveHint({
  coord,
  layout,
  tint,
  isDestination,
}: {
  coord: Coord;
  layout: BoardLayout;
  /** Resolved hint colour (own home-stretch cells use black for contrast). */
  tint: string;
  isDestination: boolean;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 480 }),
        withTiming(0.8, { duration: 480 }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 480 }),
        withTiming(0.45, { duration: 480 }),
      ),
      -1,
      true,
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const cellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (isDestination) {
    // Only the landing cell's border blinks (no background fill).
    const rect = cellRect(layout, coord.row, coord.col);
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.hintCell,
          {
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            borderColor: tint,
          },
          cellStyle,
        ]}
      />
    );
  }

  const center = centerOf(layout, coord.row, coord.col);
  const size = extentAt(layout, coord.row, coord.col) * 0.55;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hint,
        {
          left: center.x - size / 2,
          top: center.y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: tint,
          borderWidth: 3,
        },
        ringStyle,
      ]}
    />
  );
}

/** The classic four-triangle centre, each pointing to a colour's home arm. */
function CenterTriangles({ layout }: { layout: BoardLayout }) {
  const c0 = layout.edges[CORRIDOR_MIN];
  const c1 = layout.edges[CORRIDOR_MAX + 1];
  const half = (c1 - c0) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: c0,
        top: c0,
        width: 0,
        height: 0,
        borderTopWidth: half,
        borderBottomWidth: half,
        borderLeftWidth: half,
        borderRightWidth: half,
        borderTopColor: COLOR_HEX.green,
        borderRightColor: COLOR_HEX.yellow,
        borderBottomColor: COLOR_HEX.blue,
        borderLeftColor: COLOR_HEX.red,
      }}
    />
  );
}

/**
 * A fleeting emoji reaction over a player's base: a white rounded card centred
 * in the base yard (tokens still peek out around it) with the emoji on top.
 */
function ReactionBubble({
  cx,
  cy,
  size,
  emojiSize,
  emoji,
  counterDeg,
}: {
  cx: number;
  cy: number;
  size: number;
  emojiSize: number;
  emoji: string;
  counterDeg: number;
}) {
  const scale = useSharedValue(0.3);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.15, { duration: 180 }),
      withTiming(1, { duration: 140 }),
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${counterDeg}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.reactionCard,
        {
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          borderRadius: size * 0.24,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
    </Animated.View>
  );
}

/**
 * Draws the non-uniform grid, the four base yards, the move-path highlight and
 * overlays the tokens. All coordinate maths lives in layout.ts / boardPath.ts —
 * this component only positions views.
 */
export function Board({
  tokens,
  players,
  boardSize,
  movableTokenIds,
  interactive,
  selectedTokenId,
  highlightCells,
  highlightColor,
  pulseBaseColor,
  currentColor,
  rankings,
  onTokenPress,
  onMenuPress,
  rotationSteps = 0,
}: BoardProps) {
  const rot = ((rotationSteps % 4) + 4) % 4;
  const counterDeg = -rot * 90;
  // With more than one legal move, every movable token pulses to flag the choice.
  const pulseMovable = movableTokenIds.length > 1;
  const cells = useMemo(() => buildBoardCells(), []);
  const stacks = useMemo(
    () => computeStacks(tokens, currentColor),
    [tokens, currentColor],
  );
  // Token-centre image per colour: heart for Lera, lion for Leon, otherwise the
  // coloured circle for that colour.
  const faceByColor = useMemo(() => {
    const map = new Map<PlayerColor, TokenFace>();
    for (const p of players) map.set(p.color, tokenFaceFor(p.name, p.color));
    return map;
  }, [players]);
  const layout = useMemo(
    () => buildLayout(boardSize, BASE_CELL_RATIO),
    [boardSize],
  );
  const reactions = useReactionsStore((s) => s.reactions);

  const center = centerOf(layout, 7, 7);
  const menuSize = extentAt(layout, 7, 7) * 0.96;

  return (
    <View
      style={[
        styles.board,
        {
          width: layout.size,
          height: layout.size,
          transform: [{ rotate: `${rot * 90}deg` }],
        },
      ]}
    >
      {cells.map((cell) => (
        <Cell key={`${cell.row}-${cell.col}`} cell={cell} layout={layout} />
      ))}

      <CenterTriangles layout={layout} />

      {COLOR_ORDER.map((color) => {
        const rank = rankings.indexOf(color);
        return (
          <BaseYard
            key={`yard-${color}`}
            color={color}
            layout={layout}
            isPulsing={color === pulseBaseColor}
            place={rank >= 0 ? rank + 1 : null}
            counterDeg={counterDeg}
          />
        );
      })}

      {/* Base names would be upside-down/sideways when rotated; the side panels
          already show every player's name, so hide them in rotated mode. */}
      {rot === 0 &&
        players.map((player) => (
          <BaseName
            key={`name-${player.color}`}
            color={player.color}
            name={player.name}
            layout={layout}
          />
        ))}

      {highlightCells.map((coord, i) => {
        // On the mover's own home stretch the cell is already their colour, so a
        // same-colour hint would vanish — paint those black for contrast.
        const onOwnHome = HOME_PATH_BY_COLOR[highlightColor].some(
          (c) => c.row === coord.row && c.col === coord.col,
        );
        return (
          <MoveHint
            key={`hint-${coord.row}-${coord.col}`}
            coord={coord}
            layout={layout}
            tint={onOwnHome ? '#000000' : COLOR_HEX[highlightColor]}
            isDestination={i === highlightCells.length - 1}
          />
        );
      })}

      {tokens.map((token) => {
        const stack = stacks.get(token.id) ?? { index: 0, count: 1 };
        const face = faceByColor.get(token.color) ?? tokenFaceFor('', token.color);
        return (
          <Token
            key={token.id}
            token={token}
            layout={layout}
            stackIndex={stack.index}
            stackCount={stack.count}
            isMovable={movableTokenIds.includes(token.id)}
            interactive={interactive}
            isSelected={selectedTokenId === token.id}
            isPulsing={pulseMovable && movableTokenIds.includes(token.id)}
            someSelected={selectedTokenId !== null}
            centerImage={face.source}
            centerFills={face.fills}
            elevated={token.color === currentColor}
            faceRotation={counterDeg}
            onPress={onTokenPress}
          />
        );
      })}

      {COLOR_ORDER.map((color) => {
        const r = reactions[color];
        if (!r) return null;
        // Centre on the base yard's own rectangle (matches BaseYard), so the
        // card sits dead-centre; sized to leave the corner tokens peeking out.
        const origin = BASE_ORIGIN_BY_COLOR[color];
        const left = axisPos(layout, origin.col + 1.05);
        const top = axisPos(layout, origin.row + 1.05);
        const right = axisPos(layout, origin.col + 4.95);
        const bottom = axisPos(layout, origin.row + 4.95);
        const base = Math.min(right - left, bottom - top) * 0.66;
        return (
          <ReactionBubble
            key={`react-${color}-${r.id}`}
            cx={(left + right) / 2}
            cy={(top + bottom) / 2}
            size={base * 0.85}
            emojiSize={base * 0.6}
            emoji={r.emoji}
            counterDeg={counterDeg}
          />
        );
      })}

      <Pressable
        onPress={onMenuPress}
        style={[
          styles.menuButton,
          {
            left: center.x - menuSize / 2,
            top: center.y - menuSize / 2,
            width: menuSize,
            height: menuSize,
            borderRadius: menuSize / 2,
          },
        ]}
      >
        <Text
          style={[
            styles.menuIcon,
            { fontSize: menuSize * 0.5, transform: [{ rotate: `${counterDeg}deg` }] },
          ]}
        >
          ☰
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    backgroundColor: BOARD_BACKGROUND,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GRID_LINE,
    overflow: 'hidden',
  },
  yard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  slot: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  placeBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeNumber: {
    fontWeight: '900',
  },
  baseName: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  baseNamePill: {
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  baseNameText: {
    fontWeight: '800',
  },
  hint: {
    position: 'absolute',
  },
  hintCell: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 4,
  },
  reactionCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
  },
  menuButton: {
    position: 'absolute',
    backgroundColor: '#37474F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  menuIcon: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
