import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useFireworksStore, type Celebration } from '@/shared/store/fireworksStore';

/**
 * Full-screen celebratory fireworks, mounted once above every screen. Plays
 * whenever the fireworks store fires a celebration.
 *
 * One overlay serves all four games: the default is a rainbow burst, a supporter
 * win upgrades it to a denser gold salute, and a game that wants its own colours
 * (ludo tints the sparks in the winner's colour, and rains hearts for its
 * heart-named player) passes them through `celebrate({ tints, heart })`.
 */

/** Total run time of the celebratory salute; result modals wait this out. */
export const FIREWORKS_DURATION_MS = 4500;
const DURATION_MS = FIREWORKS_DURATION_MS;

const BURSTS = 7;
const PARTICLES = 26;
// Supporter victory: denser bursts and a shower of gold.
const GOLD_BURSTS = 9;
const GOLD_PARTICLES = 34;

/** Rainbow palette — each particle picks one at random for a colourful burst. */
const TINTS = [
  '#E53935',
  '#FB8C00',
  '#FDD835',
  '#43A047',
  '#1E88E5',
  '#8E24AA',
  '#EC407A',
  '#00ACC1',
];

/** Gold-dominant palette — the supporter victory salute. */
const GOLD_TINTS = [
  '#FFD700',
  '#FFC107',
  '#FFB300',
  '#FFECB3',
  '#FFF59D',
  '#FFE082',
  '#FDD835',
  '#F9A825',
];

export function FireworksOverlay() {
  const celebration = useFireworksStore((s) => s.celebration);
  const clear = useFireworksStore((s) => s.clear);

  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(clear, DURATION_MS);
    return () => clearTimeout(id);
  }, [celebration, clear]);

  if (!celebration) return null;
  return <FireworksLayer key={celebration.id} celebration={celebration} />;
}

function buildBursts(width: number, height: number, gold: boolean) {
  const count = gold ? GOLD_BURSTS : BURSTS;
  return Array.from({ length: count }, (_, i) => ({
    x: width * (0.15 + Math.random() * 0.7),
    y: height * (0.12 + Math.random() * 0.5),
    delay: i * 440 + Math.random() * 220,
  }));
}

interface ParticleConfig {
  angle: number;
  distance: number;
  size: number;
  tint: string;
}

function buildParticles(celebration: Celebration): ParticleConfig[] {
  const { gold, heart } = celebration;
  const palette = celebration.tints ?? (gold ? GOLD_TINTS : TINTS);
  // Hearts read as clutter at gold density, so they keep the normal count.
  const count = gold && !heart ? GOLD_PARTICLES : PARTICLES;
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
    distance: gold ? 85 + Math.random() * 110 : 70 + Math.random() * 95,
    size: heart ? 16 + Math.random() * 16 : 7 + Math.random() * 6,
    tint: palette[Math.floor(Math.random() * palette.length)],
  }));
}

function FireworksLayer({ celebration }: { celebration: Celebration }) {
  const { width, height } = useWindowDimensions();
  const gold = celebration.gold;
  const bursts = useMemo(
    () => buildBursts(width, height, gold),
    [width, height, gold],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((b, i) => (
        <Burst key={i} x={b.x} y={b.y} delay={b.delay} celebration={celebration} />
      ))}
    </View>
  );
}

function Burst({
  x,
  y,
  delay,
  celebration,
}: {
  x: number;
  y: number;
  delay: number;
  celebration: Celebration;
}) {
  const particles = useMemo(() => buildParticles(celebration), [celebration]);
  return (
    <View style={[styles.burst, { left: x, top: y }]}>
      {particles.map((p, i) => (
        <Particle
          key={i}
          angle={p.angle}
          distance={p.distance}
          size={p.size}
          tint={p.tint}
          delay={delay}
          heart={Boolean(celebration.heart)}
        />
      ))}
    </View>
  );
}

function Particle({
  angle,
  distance,
  size,
  tint,
  delay,
  heart,
}: {
  angle: number;
  distance: number;
  size: number;
  tint: string;
  delay: number;
  heart: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
    );
  }, [t, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = t.value;
    const dx = Math.cos(angle) * distance * p;
    const dy = Math.sin(angle) * distance * p + p * p * 70; // gravity
    const opacity =
      p === 0 ? 0 : p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
    return {
      opacity,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: 1 - p * 0.25 }],
    };
  });

  if (heart) {
    return (
      <Animated.Text style={[styles.particle, { fontSize: size }, animatedStyle]}>
        ❤️
      </Animated.Text>
    );
  }
  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tint },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  burst: { position: 'absolute' },
  particle: { position: 'absolute' },
});
