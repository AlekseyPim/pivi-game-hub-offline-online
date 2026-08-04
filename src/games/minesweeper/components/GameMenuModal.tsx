import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useT } from '@/games/minesweeper/i18n/useT';

/**
 * In-game pause menu (backdrop dismisses). Deliberately not themed — a solid
 * white card like ludo-game's pause menu, for maximum contrast over the board.
 */

interface GameMenuModalProps {
  visible: boolean;
  /** Host / local only: offer a restart. Guests just resume or leave. */
  canRestart: boolean;
  /** Local only: offer to save this game to the one resume slot. */
  canSave: boolean;
  onResume: () => void;
  onRestart: () => void;
  onSave: () => void;
  onSettings: () => void;
  onExit: () => void;
}

export function GameMenuModal({
  visible,
  canRestart,
  canSave,
  onResume,
  onRestart,
  onSave,
  onSettings,
  onExit,
}: GameMenuModalProps) {
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <Pressable style={styles.overlay} onPress={onResume}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('menu')}</Text>

          {canSave ? (
            <Pressable style={styles.item} onPress={onSave}>
              <Text style={styles.itemText}>💾  {t('save_game')}</Text>
            </Pressable>
          ) : null}

          {canRestart ? (
            <Pressable style={styles.item} onPress={onRestart}>
              <Text style={styles.itemText}>🔄  {t('restart')}</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.item} onPress={onSettings}>
            <Text style={styles.itemText}>⚙️  {t('settings')}</Text>
          </Pressable>

          <Pressable style={[styles.item, styles.danger]} onPress={onExit}>
            <Text style={[styles.itemText, styles.dangerText]}>🚪  {t('exit')}</Text>
          </Pressable>

          <Pressable style={styles.close} onPress={onResume}>
            <Text style={styles.closeText}>{t('resume')}</Text>
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
    width: 280,
    borderRadius: 20,
    padding: 18,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#212121', textAlign: 'center' },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
  },
  itemText: { fontSize: 16, fontWeight: '700', color: '#37474F' },
  danger: { backgroundColor: '#FDECEA' },
  dangerText: { color: '#C62828' },
  close: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  closeText: { fontSize: 15, fontWeight: '700', color: '#1E88E5' },
});
