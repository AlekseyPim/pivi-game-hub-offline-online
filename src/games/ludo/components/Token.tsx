import { memo, useEffect, useMemo, useRef } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  CAPTURE_RETURN_DURATION,
  JUMP_DURATION,
  STEP_DURATION,
  TOKEN_SCALE,
} from "@/games/ludo/constants/animation";
import { COLOR_DARK, COLOR_HEX } from "@/games/ludo/constants/colors";
import {
  coordForToken,
  isSafeIndex,
  mainIndexForProgress,
  waypointsBetween,
} from "@/games/ludo/logic/boardPath";
import { centerOf, extentAt, type BoardLayout } from "@/games/ludo/logic/layout";
import type { Coord, Token as TokenModel } from "@/games/ludo/types/game";

interface TokenProps {
  token: TokenModel;
  layout: BoardLayout;
  /** Index within a stack on the same cell, and how many share it. */
  stackIndex: number;
  stackCount: number;
  isMovable: boolean;
  /** Whether this device may actually tap the token (false for observers). */
  interactive: boolean;
  isSelected: boolean;
  /** Gently pulses the token to flag it as one of several legal moves. */
  isPulsing: boolean;
  /** True while some token is selected — other pulsing tokens slow down. */
  someSelected: boolean;
  /** Image shown in the centre of the token (colour circle, or heart/lion). */
  centerImage: ImageSourcePropType;
  /** A colour circle fills the token; a heart/lion icon sits smaller. */
  centerFills: boolean;
  /** Current player's tokens render above others sharing the same cell. */
  elevated: boolean;
  /** Degrees to counter-rotate the face image so it stays upright when the
   *  whole board is rotated for a single viewer. */
  faceRotation: number;
  onPress: (tokenId: string) => void;
}

interface XY {
  x: number;
  y: number;
}

/**
 * Lay stacked tokens out in a line so each stays visible. The line runs along
 * the cell's long axis: a wide (horizontal) cell stacks them horizontally, a
 * tall (vertical) cell stacks them vertically.
 */
function stackOffset(
  stackIndex: number,
  stackCount: number,
  tokenSize: number,
  vertical: boolean,
): XY {
  if (stackCount <= 1) return { x: 0, y: 0 };
  const step = tokenSize * 0.5;
  const pos = (stackIndex - (stackCount - 1) / 2) * step;
  return vertical ? { x: 0, y: pos } : { x: pos, y: 0 };
}

function topLeftFor(
  layout: BoardLayout,
  coord: Coord,
  tokenSize: number,
  offset: XY,
): XY {
  const center = centerOf(layout, coord.row, coord.col);
  return {
    x: center.x - tokenSize / 2 + offset.x,
    y: center.y - tokenSize / 2 + offset.y,
  };
}

/**
 * A single tappable token, animated with Reanimated. Its size is taken from the
 * cell it stands on, so it grows on the wide central cells and stays compact in
 * the narrow base/arm cells.
 *  - moving along the path hops cell-by-cell (withSequence)
 *  - leaving base / being captured slides directly (withTiming)
 *  - the selected token gently bounces (withRepeat)
 */
function TokenComponent({
  token,
  layout,
  stackIndex,
  stackCount,
  isMovable,
  interactive,
  isSelected,
  isPulsing,
  someSelected,
  centerImage,
  centerFills,
  elevated,
  faceRotation,
  onPress,
}: TokenProps) {
  const coord = coordForToken(token);
  // Home-stretch and finished tokens sit on the big central cells; clamp them to
  // the regular field (base) cell size so they don't balloon at the finish.
  const onHomeStretch =
    token.status === "homePath" || token.status === "finished";
  const cellExtent = onHomeStretch
    ? layout.sizes[0]
    : extentAt(layout, coord.row, coord.col);
  const tokenSize = cellExtent * TOKEN_SCALE;
  // Colour circles fill the token; the heart/lion icon sits smaller on top.
  const faceSize = tokenSize * (centerFills ? 1.06 : 0.66);
  // The square's own star is hidden the moment a token parks on it, so repeat
  // the mark on the token itself — otherwise "this one can't be captured"
  // becomes invisible exactly when it matters. Same set the rules consult
  // (`isSafeIndex`), so the badge can never disagree with capture behaviour.
  const onSafeSquare =
    token.status === "active" &&
    isSafeIndex(mainIndexForProgress(token.color, token.progress));
  const badgeSize = tokenSize * 0.44;
  // Wide (horizontal) cells stack horizontally; tall (vertical) cells vertically.
  const cellWidth = layout.sizes[Math.floor(coord.col)] ?? tokenSize;
  const cellHeight = layout.sizes[Math.floor(coord.row)] ?? tokenSize;
  // Memoized so the movement effect only re-runs on an actual position change,
  // not on unrelated re-renders (a fresh offset object would interrupt a walk).
  const offset = useMemo(
    () =>
      stackOffset(stackIndex, stackCount, tokenSize, cellHeight > cellWidth),
    [stackIndex, stackCount, tokenSize, cellHeight, cellWidth],
  );

  const initial = topLeftFor(layout, coord, tokenSize, offset);
  const tx = useSharedValue(initial.x);
  const ty = useSharedValue(initial.y);
  const scale = useSharedValue(1);
  // Independent of `scale` (selection/pulse) so they never fight over one value.
  const captureScale = useSharedValue(1);
  // Per-hop bump (1.0→1.1→1.0) while walking the path.
  const hopScale = useSharedValue(1);

  const prevProgress = useRef(token.progress);
  const prevStatus = useRef(token.status);

  // Movement animation, triggered whenever the token's logical position changes.
  useEffect(() => {
    const dest = topLeftFor(layout, coord, tokenSize, offset);

    const walkedForward =
      token.status !== "base" &&
      prevStatus.current !== "base" &&
      token.progress > prevProgress.current;

    // Captured: was on the path, now back in base. Returns with a 1.3→1.0 pop.
    const wasCaptured =
      token.status === "base" &&
      prevStatus.current !== "base" &&
      prevProgress.current >= 0;

    if (walkedForward) {
      const hops = waypointsBetween(
        token.color,
        prevProgress.current,
        token.progress,
      ).map((c) => topLeftFor(layout, c, tokenSize, offset));

      if (hops.length > 0) {
        tx.value = withSequence(
          ...hops.map((h) => withTiming(h.x, { duration: STEP_DURATION })),
        );
        ty.value = withSequence(
          ...hops.map((h) =>
            withTiming(h.y, {
              duration: STEP_DURATION,
              easing: Easing.inOut(Easing.quad),
            }),
          ),
        );
        // Swell to 1.1 mid-hop and settle back to 1.0 on landing — once per cell.
        hopScale.value = withSequence(
          ...hops.flatMap(() => [
            withTiming(1.1, {
              duration: STEP_DURATION / 2,
              easing: Easing.out(Easing.quad),
            }),
            withTiming(1, {
              duration: STEP_DURATION / 2,
              easing: Easing.in(Easing.quad),
            }),
          ]),
        );
      }
    } else {
      // The trip back to base after a capture is a slow, deliberate glide.
      const duration = wasCaptured ? CAPTURE_RETURN_DURATION : JUMP_DURATION;
      tx.value = withTiming(dest.x, { duration });
      ty.value = withTiming(dest.y, { duration });
      if (wasCaptured) {
        // Smoothly swell to 1.3 and settle back to 1.0 — no abrupt pop.
        captureScale.value = withSequence(
          withTiming(1.3, {
            duration: duration / 2,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1, {
            duration: duration / 2,
            easing: Easing.in(Easing.quad),
          }),
        );
      }
    }

    prevProgress.current = token.progress;
    prevStatus.current = token.status;
  }, [token, layout, coord, tokenSize, offset, tx, ty, captureScale, hopScale]);

  // Movable tokens pulse to 1.2; the selected one (awaiting a confirming tap)
  // pulses 0.15 larger (1.35).
  useEffect(() => {
    if (isSelected) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 420 }),
          withTiming(1.0, { duration: 420 }),
        ),
        -1,
        true,
      );
    } else if (isPulsing) {
      // Other movable tokens pulse slower while one is selected.
      const dur = someSelected ? 720 : 420;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: dur }),
          withTiming(1.0, { duration: dur }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isSelected, isPulsing, someSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value * captureScale.value * hopScale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={isMovable && interactive ? "auto" : "none"}
      style={[
        styles.container,
        { width: tokenSize, height: tokenSize, zIndex: elevated ? 5 : 1 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => onPress(token.id)}
        disabled={!isMovable || !interactive}
        style={[
          styles.token,
          {
            width: tokenSize,
            height: tokenSize,
            borderRadius: tokenSize / 2,
            backgroundColor: COLOR_HEX[token.color],
            borderColor: isMovable ? "#FFFFFF" : COLOR_DARK[token.color],
            borderWidth: isMovable ? 3 : 2,
          },
        ]}
      >
        <Image
          source={centerImage}
          resizeMode="contain"
          style={{
            width: faceSize,
            height: faceSize,
            transform: [{ rotate: `${faceRotation}deg` }],
          }}
        />
        {onSafeSquare && (
          <View
            pointerEvents="none"
            style={[
              styles.badgeLayer,
              // Rotating the whole layer (not just the glyph) keeps the badge
              // in the viewer's top-right corner on a rotated board, instead of
              // sliding to the bottom-left with the rest of the geometry.
              {
                padding: badgeSize * 0.1,
                transform: [{ rotate: `${faceRotation}deg` }],
              },
            ]}
          >
            <Text
              style={[
                styles.badge,
                { fontSize: badgeSize, lineHeight: badgeSize },
              ]}
            >
              ★
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  token: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  badgeLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  badge: {
    color: "#FFFFFF",
    // Tokens come in four colours, and white alone washes out on yellow — the
    // dark halo is what keeps the star readable on every one of them.
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
    includeFontPadding: false,
  },
});

export const Token = memo(TokenComponent);
