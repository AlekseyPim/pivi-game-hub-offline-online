import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLOR_HEX } from '@/games/ludo/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/games/ludo/i18n/useT';
import { nameWithEmoji } from '@/games/ludo/logic/nameEmoji';
import type { CaptureEvent, Player, PlayerColor } from '@/games/ludo/types/game';

interface GameOverModalProps {
  visible: boolean;
  players: Player[];
  /** Finishing order: index 0 = 1st place. */
  rankings: PlayerColor[];
  moveCount: number;
  captures: CaptureEvent[];
  onFinish: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** End-of-game summary: places, total moves and the capture tally. */
export function GameOverModal({
  visible,
  players,
  rankings,
  moveCount,
  captures,
  onFinish,
}: GameOverModalProps) {
  const theme = useTheme();
  const t = useT();
  const nameOf = (color: PlayerColor) => {
    const player = players.find((p) => p.color === color);
    return player ? nameWithEmoji(player.name) : color;
  };

  // Aggregate captures into "by -> victim -> count" lines per player.
  const killLines = players
    .map((player) => {
      const victims = new Map<PlayerColor, number>();
      for (const c of captures) {
        if (c.by !== player.color) continue;
        victims.set(c.victim, (victims.get(c.victim) ?? 0) + 1);
      }
      if (victims.size === 0) return null;
      const parts = [...victims.entries()]
        .map(([victim, n]) => `${nameOf(victim)} ×${n}`)
        .join(', ');
      return { color: player.color, text: `${nameOf(player.color)}: ${parts}` };
    })
    .filter((line): line is { color: PlayerColor; text: string } => line !== null);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('game_over')}
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Places */}
            <View style={styles.section}>
              {rankings.map((color, i) => (
                <View key={color} style={styles.placeRow}>
                  <Text style={styles.placeBadge}>
                    {MEDALS[i] ?? `${i + 1}.`}
                  </Text>
                  <View
                    style={[styles.dot, { backgroundColor: COLOR_HEX[color] }]}
                  />
                  <Text style={[styles.placeName, { color: theme.textPrimary }]}>
                    {nameOf(color)}
                  </Text>
                  <Text style={[styles.placeRank, { color: theme.textSecondary }]}>
                    {t('place', { n: i + 1 })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Moves */}
            <Text style={[styles.stat, { color: theme.textSecondary }]}>
              {t('moves_made')}{' '}
              <Text style={styles.statValue}>{moveCount}</Text>
            </Text>

            {/* Captures */}
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('captures_title')}
            </Text>
            {killLines.length === 0 ? (
              <Text style={[styles.stat, { color: theme.textSecondary }]}>
                {t('no_captures')}
              </Text>
            ) : (
              killLines.map((line) => (
                <View key={line.color} style={styles.killRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: COLOR_HEX[line.color] },
                    ]}
                  />
                  <Text
                    style={[styles.killText, { color: theme.textPrimary }]}
                  >
                    {line.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable style={styles.primaryButton} onPress={onFinish}>
            <Text style={styles.primaryButtonText}>{t('finish')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    width: 320,
    maxHeight: '85%',
    alignItems: 'center',
    gap: 6,
  },
  trophy: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  section: {
    gap: 8,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeBadge: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  placeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  placeRank: {
    fontSize: 13,
    fontWeight: '600',
  },
  stat: {
    fontSize: 15,
    marginTop: 4,
  },
  statValue: {
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  killRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  killText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 12,
    alignSelf: 'stretch',
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
