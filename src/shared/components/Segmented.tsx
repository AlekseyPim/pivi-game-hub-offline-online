import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT } from '@/shared/constants/colors';
import { useTheme } from '@/shared/constants/theme';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  label?: string;
  hint?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** A small pill-style segmented control used across menu / settings / lobby. */
export function Segmented<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  disabled,
}: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <View style={[styles.track, { backgroundColor: theme.card }, disabled && styles.disabled]}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              style={[styles.segment, active && { backgroundColor: ACCENT }]}
              onPress={() => !disabled && onChange(opt.value)}
              disabled={disabled}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  { color: active ? '#FFFFFF' : theme.textPrimary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  track: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  disabled: { opacity: 0.5 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12 },
});
