import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';

/**
 * The way out of a game and back to the hub's list, pinned to the top-left of
 * every game's main menu.
 *
 * Each of these menus used to be the root screen of its own app, so nothing led
 * away from it; inside the hub it sits one push deep and needs a visible exit —
 * the swipe-back gesture alone is not something a player can see.
 *
 * Laid out in the flow, as the first child of the menu's `SafeAreaView`, rather
 * than absolutely positioned: an absolute child is not offset by that view's
 * safe-area padding, so it ended up under the status bar. The menus below it
 * centre themselves in whatever height is left, so the row costs them nothing.
 */
export function HubBackButton() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t('hub_all_games')}
    >
      <Text style={[styles.chevron, { color: theme.textPrimary }]}>‹</Text>
      <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={1}>
        {t('hub_all_games')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 16,
  },
  chevron: { fontSize: 30, fontWeight: '700', lineHeight: 32 },
  label: { fontSize: 16, fontWeight: '700' },
});
