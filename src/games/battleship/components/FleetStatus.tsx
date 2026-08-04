import { StyleSheet, Text, View } from 'react-native';

import { FLEET_BY_SIZE } from '@/games/battleship/constants/board';
import { boardPalette, SUNK_COLOR } from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { usePrefsStore } from '@/games/battleship/store/prefsStore';
import type { Ship } from '@/games/battleship/types/game';

/**
 * The enemy fleet at a glance: one row per ship class, biggest first — a little
 * hull with a rounded bow and how many of that class are still afloat out of the
 * full complement (`2/4`). A class that has been wiped out goes red and dims.
 *
 * It is fed only the ships we are *allowed* to know about (the confirmed
 * wrecks), so it gives nothing away even in a local game, where our own state
 * happens to hold the bot's entire arrangement.
 */

/** Side of one deck square in the icons. */
const DECK = 9;

interface FleetStatusProps {
  /** Wrecks confirmed so far. */
  sunk: Ship[];
}

export function FleetStatus({ sunk }: FleetStatusProps) {
  const theme = useTheme();
  const palette = boardPalette(usePrefsStore((s) => s.boardTheme));

  const lost = new Map<number, number>();
  for (const ship of sunk) lost.set(ship.size, (lost.get(ship.size) ?? 0) + 1);

  return (
    <View style={styles.column}>
      {FLEET_BY_SIZE.map(({ size, count }) => {
        const left = Math.max(0, count - (lost.get(size) ?? 0));
        const gone = left === 0;
        return (
          <View key={size} style={styles.row}>
            <ShipIcon
              decks={size}
              color={gone ? SUNK_COLOR : palette.ship}
              dimmed={gone}
            />
            <Text
              style={[
                styles.count,
                { color: gone ? SUNK_COLOR : theme.textPrimary },
                gone && styles.dim,
              ]}
            >
              {left}
              <Text style={[styles.total, { color: theme.textSecondary }]}>/{count}</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A hull of `decks` squares: blunt stern on the left, rounded bow on the right. */
function ShipIcon({
  decks,
  color,
  dimmed,
}: {
  decks: number;
  color: string;
  dimmed: boolean;
}) {
  return (
    <View style={[styles.hull, dimmed && styles.dim]}>
      {Array.from({ length: decks }, (_, i) => (
        <View
          key={i}
          style={[
            styles.deck,
            { backgroundColor: color },
            i === 0 && styles.stern,
            i === decks - 1 && styles.bow,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hull: { flexDirection: 'row', gap: 1, width: DECK * 4 + 3, justifyContent: 'flex-start' },
  deck: { width: DECK, height: DECK },
  stern: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  bow: { borderTopRightRadius: DECK / 2, borderBottomRightRadius: DECK / 2 },
  count: { fontSize: 15, fontWeight: '800', minWidth: 32 },
  total: { fontSize: 12, fontWeight: '700' },
  dim: { opacity: 0.45 },
});
