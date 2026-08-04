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
 * Absolutely positioned so it can be dropped into a menu without disturbing the
 * centred layout underneath it.
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
    position: 'absolute',
    top: 6,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 10,
  },
  chevron: { fontSize: 30, fontWeight: '700', lineHeight: 32 },
  label: { fontSize: 16, fontWeight: '700' },
});
