import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT, BOARD_PALETTES } from '@/games/minesweeper/constants/colors';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import { usePrefsStore } from '@/games/minesweeper/store/prefsStore';

/**
 * Board colour palette picker — the one preference that belongs to minesweeper
 * and nothing else, so it is mounted into the shared settings screen from
 * minesweeper's own `/settings` route rather than shipped with it.
 *
 * The palette is the same in light and dark app themes: only the board surface
 * changes, the chrome around it follows the hub.
 */
export function BoardThemePicker() {
  const theme = useTheme();
  const t = useT();
  const boardTheme = usePrefsStore((s) => s.boardTheme);
  const setBoardTheme = usePrefsStore((s) => s.setBoardTheme);

  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        {t('board_theme')}
      </Text>
      <View style={styles.swatchRow}>
        {BOARD_PALETTES.map((p) => {
          const active = p.key === boardTheme;
          return (
            <Pressable
              key={p.key}
              onPress={() => setBoardTheme(p.key)}
              style={[
                styles.swatch,
                {
                  backgroundColor: p.swatch,
                  borderColor: active ? ACCENT : 'transparent',
                },
              ]}
            >
              {active ? <Text style={styles.swatchCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: -6,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
});
