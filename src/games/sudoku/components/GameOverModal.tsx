import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT, playerColor } from '@/games/sudoku/constants/colors';
import { useTheme } from '@/games/sudoku/constants/theme';
import { useT } from '@/games/sudoku/i18n/useT';
import type { PlayerResult } from '@/games/sudoku/types/game';

/** End-of-game summary: who filled what, how long it took, how many slips. */

interface GameOverModalProps {
  visible: boolean;
  won: boolean;
  online: boolean;
  results: PlayerResult[];
  mySlot: number;
  elapsedMs: number;
  canRestart: boolean;
  onDismiss: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GameOverModal({
  visible,
  won,
  online,
  results,
  mySlot,
  elapsedMs,
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

          <Text style={styles.hero}>{won ? '🏆' : '🙂'}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {won ? t('you_win') : t('you_lose')}
          </Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>
            {t('time')}: {formatTime(elapsedMs)}
          </Text>

          <View style={styles.results}>
            {results.map((r) => (
              <View
                key={r.index}
                style={[styles.row, { borderColor: theme.dark ? '#333' : '#ECECEC' }]}
              >
                <View style={[styles.dot, { backgroundColor: playerColor(r.index) }]} />
                <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>
                  {online
                    ? r.index === mySlot
                      ? t('you')
                      : r.name || t('opponent')
                    : r.name || t('player')}
                </Text>
                <Stat value={`${r.filled}/${r.total}`} label={t('filled')} theme={theme} />
                <Stat value={r.mistakes} label={t('mistakes')} theme={theme} />
              </View>
            ))}
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
    width: 340,
    maxWidth: '100%',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  close: { position: 'absolute', top: 10, right: 12, padding: 6, zIndex: 1 },
  closeIcon: { fontSize: 20, fontWeight: '700' },
  hero: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800' },
  time: { fontSize: 14, fontWeight: '700' },
  results: { alignSelf: 'stretch', gap: 8, marginVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, fontSize: 15, fontWeight: '700' },
  stat: { alignItems: 'center', width: 62 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },
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
