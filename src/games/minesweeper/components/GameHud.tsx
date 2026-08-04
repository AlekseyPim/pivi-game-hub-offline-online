import { StyleSheet, Text, View } from 'react-native';

import { playerColor } from '@/games/minesweeper/constants/colors';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import type { GameState } from '@/games/minesweeper/types/game';

interface GameHudProps {
  state: GameState;
  mySlot: number | null;
}

/** Top status bar: mines counter, lives, turn indicator + per-player stats. */
export function GameHud({ state, mySlot }: GameHudProps) {
  const theme = useTheme();
  const t = useT();

  const flagsTotal = state.cells.reduce(
    (n, c) => n + (c.mark === 'flag' ? 1 : 0),
    0,
  );
  const minesLeft = state.mines - flagsTotal;
  const multiplayer = state.players.length > 1;

  const flagsByPlayer = (slot: number) =>
    state.cells.reduce(
      (n, c) => n + (c.owner === slot && c.mark === 'flag' ? 1 : 0),
      0,
    );

  let statusLabel = '';
  if (multiplayer && state.turnMode === 'sequential') {
    const current = state.currentPlayerIndex;
    statusLabel =
      mySlot != null && current === mySlot
        ? t('your_turn')
        : t('turn_of', {
            name:
              state.players[current]?.name || t('player_n', { n: current + 1 }),
          });
  } else if (multiplayer) {
    statusLabel = t('parallel');
  } else if (state.difficulty === 'easy') {
    statusLabel = '❤️'.repeat(Math.max(0, state.livesLeft)) || '💔';
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: theme.card }]}>
          <Text style={styles.pillIcon}>💣</Text>
          <Text style={[styles.pillValue, { color: theme.textPrimary }]}>
            {minesLeft}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={[styles.status, { color: theme.textPrimary }]}
        >
          {statusLabel}
        </Text>

        {!multiplayer && state.difficulty === 'easy' ? (
          <View style={[styles.pill, { backgroundColor: theme.card }]}>
            <Text style={styles.pillIcon}>❤️</Text>
            <Text style={[styles.pillValue, { color: theme.textPrimary }]}>
              {state.livesLeft}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: theme.card }]}>
            <Text style={styles.pillIcon}>🚩</Text>
            <Text style={[styles.pillValue, { color: theme.textPrimary }]}>
              {flagsTotal}
            </Text>
          </View>
        )}
      </View>

      {multiplayer ? (
        <View style={styles.chips}>
          {state.players.map((p, slot) => {
            const isTurn =
              state.turnMode === 'sequential' && state.currentPlayerIndex === slot;
            const isMe = mySlot === slot;
            return (
              <View
                key={slot}
                style={[
                  styles.chip,
                  { backgroundColor: theme.card },
                  isTurn && { borderColor: playerColor(slot), borderWidth: 2 },
                ]}
              >
                <View
                  style={[styles.dot, { backgroundColor: playerColor(slot) }]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.chipName, { color: theme.textPrimary }]}
                >
                  {isMe ? t('you') : p.name || t('player_n', { n: slot + 1 })}
                </Text>
                <Text style={[styles.chipStat, { color: theme.textSecondary }]}>
                  👣{state.moveCounts[slot] ?? 0} · 🚩{flagsByPlayer(slot)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 66,
    justifyContent: 'center',
  },
  pillIcon: { fontSize: 16 },
  pillValue: { fontSize: 18, fontWeight: '800' },
  status: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chipName: { fontSize: 13, fontWeight: '700', maxWidth: 90 },
  chipStat: { fontSize: 12, fontWeight: '600' },
});
