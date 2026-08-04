import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DIGITS } from '@/games/sudoku/constants/board';
import { ACCENT } from '@/games/sudoku/constants/colors';
import { useTheme } from '@/games/sudoku/constants/theme';
import { useT } from '@/games/sudoku/i18n/useT';

/**
 * The digit keyboard, plus the two tools that make a sudoku playable: pencil
 * mode and the eraser.
 *
 * A digit that is already placed nine times is dimmed and dead — one less thing
 * to check by eye, and it gives nothing away that is not already on the board.
 */

interface NumberPadProps {
  /** How many of each digit are still missing from the grid. */
  remaining: Record<number, number>;
  noteMode: boolean;
  disabled: boolean;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
}

export function NumberPad({
  remaining,
  noteMode,
  disabled,
  onDigit,
  onErase,
  onToggleNotes,
}: NumberPadProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={styles.wrap}>
      <View style={styles.tools}>
        <Pressable
          onPress={onToggleNotes}
          style={[
            styles.tool,
            { backgroundColor: noteMode ? ACCENT : theme.card },
          ]}
        >
          <Text
            style={[styles.toolText, { color: noteMode ? '#FFFFFF' : theme.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ✏️  {t('notes')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onErase}
          disabled={disabled}
          style={[styles.tool, { backgroundColor: theme.card }, disabled && styles.dim]}
        >
          <Text
            style={[styles.toolText, { color: theme.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ⌫  {t('erase')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.digits}>
        {DIGITS.map((digit) => {
          const left = remaining[digit] ?? 0;
          const spent = left <= 0;
          return (
            <Pressable
              key={digit}
              onPress={() => onDigit(digit)}
              disabled={disabled || spent}
              style={[
                styles.key,
                { backgroundColor: theme.card },
                (disabled || spent) && styles.dim,
              ]}
            >
              <Text style={[styles.keyDigit, { color: theme.textPrimary }]}>{digit}</Text>
              <Text style={[styles.keyLeft, { color: theme.textSecondary }]}>
                {spent ? '' : left}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: 10 },
  tools: { flexDirection: 'row', gap: 10 },
  tool: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { fontSize: 15, fontWeight: '700' },
  digits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  key: {
    width: 62,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: { fontSize: 24, fontWeight: '800', lineHeight: 27 },
  keyLeft: { fontSize: 10, fontWeight: '700' },
  dim: { opacity: 0.35 },
});
