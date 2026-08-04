import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { ACCENT } from '@/games/minesweeper/constants/colors';
import type { Theme } from '@/games/minesweeper/constants/theme';

const THUMB = 28;
const TRACK_H = 6;

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  theme: Theme;
}

/**
 * A minimal controlled slider built on a single Pan gesture (no new deps). The
 * thumb position is derived from `value`, so the parent owns the state; dragging
 * snaps the touch to the nearest step and reports it through `onChange`. Used for
 * the mine-density regulator in the setup modal.
 */
export function Slider({ min, max, step, value, onChange, theme }: SliderProps) {
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - THUMB); // pixel range the thumb centre moves over

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const commit = useMemo(() => {
    // Map a touch x (relative to the track) to the nearest legal value.
    return (x: number) => {
      if (travel <= 0) return;
      const frac = Math.min(1, Math.max(0, (x - THUMB / 2) / travel));
      const steps = Math.round((frac * (max - min)) / step);
      const next = Math.min(max, Math.max(min, min + steps * step));
      onChange(Math.round(next * 100) / 100);
    };
  }, [travel, min, max, step, onChange]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => commit(e.x))
        .onUpdate((e) => commit(e.x)),
    [commit],
  );

  const frac = max > min ? (value - min) / (max - min) : 0;
  const left = frac * travel;

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.hitArea} onLayout={onLayout} collapsable={false}>
        <View style={[styles.track, { backgroundColor: theme.card }]}>
          <View
            style={[styles.fill, { width: left + THUMB / 2, backgroundColor: ACCENT }]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            { left, backgroundColor: theme.background, borderColor: ACCENT },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: THUMB + 12,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    top: '50%',
    marginTop: -THUMB / 2,
  },
});
