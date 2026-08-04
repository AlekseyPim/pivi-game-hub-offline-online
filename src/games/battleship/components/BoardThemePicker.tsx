import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT, BOARD_PALETTES } from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { useT } from '@/games/battleship/i18n/useT';
import { usePrefsStore } from '@/games/battleship/store/prefsStore';

/**
 * Water/hull palette picker — the one preference that belongs to battleship and
 * nothing else, so it is mounted into the shared settings screen from
 * battleship's own `/settings` route rather than shipped with it.
 *
 * Each swatch shows the water colour with a sliver of hull along the bottom, so
 * the two colours that actually matter are both visible before choosing.
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
                { backgroundColor: p.swatch, borderColor: active ? ACCENT : 'transparent' },
              ]}
            >
              <View style={[styles.swatchShip, { backgroundColor: p.ship }]} />
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
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchShip: {
    position: 'absolute',
    left: 6,
    bottom: 8,
    width: 26,
    height: 8,
    borderRadius: 3,
  },
  swatchCheck: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
});
