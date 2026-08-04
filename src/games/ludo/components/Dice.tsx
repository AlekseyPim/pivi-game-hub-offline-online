import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COLOR_DARK, COLOR_HEX } from '@/games/ludo/constants/colors';
import type { PlayerColor } from '@/games/ludo/types/game';

interface DiceProps {
  value: number | null;
  color: PlayerColor;
  /** Disabled once rolled, until the turn resets. */
  disabled: boolean;
  /** True while the tumble animation plays; faces cycle and the die spins. */
  rolling: boolean;
  onRoll: () => void;
}

/** Pip layout (3x3 grid positions) for each die face. */
const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** How often the face changes while tumbling. */
const FACE_FLIP_MS = 90;

const DICE_SIZE = 64;
/** Vertical drift while rolling (X drift removed; Y range kept modest). */
const SHAKE_TRAVEL_Y = DICE_SIZE * 0.09;

function randomFace(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * The die. Tapping rolls it; while `rolling` is true it spins and rapidly
 * flips through random faces, then settles onto the final `value` with a little
 * bounce once `rolling` turns false.
 */
export function Dice({ value, color, disabled, rolling, onRoll }: DiceProps) {
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);
  const shakeY = useSharedValue(0);
  const [displayFace, setDisplayFace] = useState(value ?? 1);
  const flipTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rolling) {
      // Continuous spin, rapid face changes, a vertical-only tremble and a
      // bigger/smaller pulse while it tumbles.
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(1, { duration: 480, easing: Easing.linear }),
        -1,
        false,
      );
      shakeY.value = withRepeat(
        withSequence(
          withTiming(SHAKE_TRAVEL_Y, { duration: 130, easing: Easing.inOut(Easing.sin) }),
          withTiming(-SHAKE_TRAVEL_Y, { duration: 130, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 180, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: 180, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      flipTimer.current = setInterval(() => {
        setDisplayFace(randomFace());
      }, FACE_FLIP_MS);
    } else {
      if (flipTimer.current) {
        clearInterval(flipTimer.current);
        flipTimer.current = null;
      }
      cancelAnimation(spin);
      cancelAnimation(shakeY);
      cancelAnimation(scale);
      // Finish the spin forward to a whole turn (1 == 2π == upright) so it always
      // settles clockwise, never rewinding back to 0.
      spin.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      shakeY.value = withTiming(0, { duration: 150 });

      if (!disabled) {
        // Ready to roll: breathe continuously between 1.0 and 0.85 until tapped.
        scale.value = withRepeat(
          withSequence(
            withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        );
      } else {
        // Settled after a roll: snap to the real value with a little bounce.
        scale.value = withSequence(
          withTiming(1.22, { duration: 130 }),
          withTiming(1, { duration: 160 }),
        );
      }
    }

    return () => {
      if (flipTimer.current) {
        clearInterval(flipTimer.current);
        flipTimer.current = null;
      }
    };
  }, [rolling, disabled, value, spin, scale, shakeY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: shakeY.value },
      { rotate: `${spin.value * 2 * Math.PI}rad` },
      { scale: scale.value },
    ],
  }));

  const face = rolling ? displayFace : value;
  const pips = face ? PIP_LAYOUT[face] : [];

  return (
    <Pressable onPress={onRoll} disabled={disabled}>
      <Animated.View
        style={[
          styles.dice,
          {
            borderColor: COLOR_DARK[color],
            opacity: disabled && !rolling ? 0.55 : 1,
          },
          animatedStyle,
        ]}
      >
        {face ? (
          <View style={styles.grid}>
            {Array.from({ length: 9 }, (_, i) => (
              <View key={i} style={styles.slot}>
                {pips.includes(i) && (
                  <View
                    style={[styles.pip, { backgroundColor: COLOR_HEX[color] }]}
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          // Not rolled yet: prompt to roll instead of showing a blank face.
          <Text style={styles.rollIcon}>🎲</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dice: {
    width: DICE_SIZE,
    height: DICE_SIZE,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rollIcon: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: DICE_SIZE * 0.5,
    lineHeight: DICE_SIZE - 16,
  },
  slot: {
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
