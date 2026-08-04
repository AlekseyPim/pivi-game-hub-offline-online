import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT, playerColor } from '@/games/battleship/constants/colors';
import { useTheme } from '@/games/battleship/constants/theme';
import { useT } from '@/games/battleship/i18n/useT';
import type { PlayerResult } from '@/games/battleship/types/game';

/**
 * End-of-battle summary: who won, plus each side's shots, hits, accuracy and
 * how many enemy ships they sank.
 */

interface GameOverModalProps {
  visible: boolean;
  won: boolean;
  results: PlayerResult[];
  mySlot: number;
  /** Local games and the online host may start another round. */
  canRestart: boolean;
  /** Dismissible so the player can inspect the final boards, then reopen it. */
  onDismiss: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameOverModal({
  visible,
  won,
  results,
  mySlot,
  canRestart,
  onDismiss,
  onPlayAgain,
  onExit,
}: GameOverModalProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor: theme.card }]}>
          <Pressable style={styles.close} onPress={onDismiss} hitSlop={10}>
            <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>

          <Text style={styles.hero}>{won ? '🏆' : '💥'}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {won ? t('you_win') : t('you_lose')}
          </Text>

          <View style={styles.results}>
            {results.map((r) => {
              const isMe = r.index === mySlot;
              const accuracy = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
              return (
                <View
                  key={r.index}
                  style={[styles.row, { borderColor: theme.dark ? '#333' : '#ECECEC' }]}
                >
                  <View style={[styles.dot, { backgroundColor: playerColor(r.index) }]} />
                  <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>
                    {isMe ? t('you') : r.name || t('opponent')}
                  </Text>
                  <Stat value={r.shots} label={t('shots')} theme={theme} />
                  <Stat value={r.hits} label={t('hits')} theme={theme} />
                  <Stat value={`${accuracy}%`} label={t('accuracy')} theme={theme} />
                  <Stat value={r.sunk} label={t('sunk_count')} theme={theme} />
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

function Stat({
  value,
  label,
  theme,
}: {
  value: string | number;
  label: string;
  theme: { textPrimary: string; textSecondary: string };
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: 360,
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
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  stat: { alignItems: 'center', width: 46 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600' },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: ACCENT,
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
    borderColor: ACCENT,
    alignItems: 'center',
  },
  secondaryButtonText: { color: ACCENT, fontSize: 16, fontWeight: '700' },
});
