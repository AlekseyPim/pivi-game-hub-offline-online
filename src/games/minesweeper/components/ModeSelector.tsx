import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT } from '@/games/minesweeper/constants/colors';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';

/**
 * The tap-action for the board:
 *  - reveal:   tap opens a cell (long-press still cycles marks)
 *  - flag:     tap toggles a flag on / off
 *  - question: tap toggles a "?" on / off
 */
export type InteractionMode = 'reveal' | 'flag' | 'question' | 'clear';

const MODES: { mode: InteractionMode; icon: string; label: string }[] = [
  { mode: 'reveal', icon: '👆', label: 'mode_open' },
  { mode: 'flag', icon: '🚩', label: 'mode_flag' },
  { mode: 'question', icon: '❓', label: 'mode_question' },
  { mode: 'clear', icon: '🧹', label: 'mode_clear' },
];

interface ModeSelectorProps {
  mode: InteractionMode;
  onChange: (mode: InteractionMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={styles.row}>
      {MODES.map((m) => {
        const active = m.mode === mode;
        return (
          <Pressable
            key={m.mode}
            onPress={() => onChange(m.mode)}
            style={[
              styles.button,
              { backgroundColor: theme.card },
              active && { backgroundColor: ACCENT },
            ]}
          >
            <Text style={styles.icon}>{m.icon}</Text>
            <Text
              style={[
                styles.label,
                { color: active ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {t(m.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  button: {
    flex: 1,
    maxWidth: 140,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  icon: { fontSize: 22 },
  label: { fontSize: 12, fontWeight: '700' },
});
