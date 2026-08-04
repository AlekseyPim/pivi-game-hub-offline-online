import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { playerColor } from '@/games/minesweeper/constants/colors';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import type { Phase, PlayerResult } from '@/games/minesweeper/types/game';

/**
 * End-of-game summary. Regardless of win or loss it shows every player's move
 * count and how many mines they correctly flagged (the brief's requirement).
 */

interface GameOverModalProps {
  visible: boolean;
  phase: Phase;
  results: PlayerResult[];
  totalMines: number;
  mySlot: number | null;
  /** Host / local only. Guests can't restart the shared board. */
  canRestart: boolean;
  /** When set, the modal can be dismissed (tap the backdrop or ✕) — used on a
   * loss so the player can inspect the finished board, then reopen it. */
  dismissible?: boolean;
  onDismiss?: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameOverModal({
  visible,
  phase,
  results,
  totalMines,
  mySlot,
  canRestart,
  dismissible = false,
  onDismiss,
  onPlayAgain,
  onExit,
}: GameOverModalProps) {
  const theme = useTheme();
  const t = useT();
  const won = phase === 'won';
  const multiplayer = results.length > 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? onDismiss : undefined}
    >
      <Pressable
        style={styles.overlay}
        disabled={!dismissible}
        onPress={dismissible ? onDismiss : undefined}
      >
        {/* Stop taps inside the card from dismissing. */}
        <Pressable style={[styles.card, { backgroundColor: theme.card }]}>
          {dismissible ? (
            <Pressable style={styles.close} onPress={onDismiss} hitSlop={10}>
              <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hero}>{won ? '🏆' : '💥'}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {won ? t('you_win') : t('you_lose')}
          </Text>

          <View style={styles.results}>
            {results.map((r) => {
              const isMe = mySlot != null && r.index === mySlot;
              return (
                <View
                  key={r.index}
                  style={[styles.row, { borderColor: theme.dark ? '#333' : '#ECECEC' }]}
                >
                  <View
                    style={[styles.dot, { backgroundColor: playerColor(r.index) }]}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.name, { color: theme.textPrimary }]}
                  >
                    {multiplayer
                      ? isMe
                        ? t('you')
                        : r.name || t('player_n', { n: r.index + 1 })
                      : r.name || t('player')}
                  </Text>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                      {r.moves}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      {t('moves')}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                      {r.correctFlags}
                      {multiplayer ? '' : `/${totalMines}`}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      {t('mines_found')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {canRestart ? (
            <Pressable style={styles.primaryButton} onPress={onPlayAgain}>
              <Text style={styles.primaryButtonText}>{t('play_again')}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.secondaryButton} onPress={onExit}>
            <Text style={styles.secondaryButtonText}>{t('exit')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
    width: 320,
    maxWidth: '100%',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  close: { position: 'absolute', top: 10, right: 12, padding: 6, zIndex: 1 },
  closeIcon: { fontSize: 20, fontWeight: '700' },
  hero: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800' },
  results: { alignSelf: 'stretch', gap: 8, marginVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700' },
  stat: { alignItems: 'center', width: 58 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1E88E5',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1E88E5', fontSize: 16, fontWeight: '700' },
});
