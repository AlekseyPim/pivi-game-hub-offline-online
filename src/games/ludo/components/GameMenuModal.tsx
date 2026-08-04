import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useT } from '@/games/ludo/i18n/useT';
import { copyToClipboard } from '@/shared/logic/clipboard';

interface GameMenuModalProps {
  visible: boolean;
  /** True right after a successful save, to swap the label to a confirmation. */
  justSaved: boolean;
  /** Online only: shown so players can read the room code back at any time. */
  roomCode?: string | null;
  onSave: () => void;
  onRestart: () => void;
  /** Opens the rename screen. Omitted (item hidden) for online guests. */
  onNames?: () => void;
  onRules: () => void;
  onSettings: () => void;
  onExit: () => void;
  onClose: () => void;
}

/** In-game pause menu: save / restart / exit, over a dimmed backdrop. */
export function GameMenuModal({
  visible,
  justSaved,
  roomCode,
  onSave,
  onRestart,
  onNames,
  onRules,
  onSettings,
  onExit,
  onClose,
}: GameMenuModalProps) {
  const t = useT();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menuCard} onPress={() => {}}>
          <Text style={styles.menuTitle}>{t('menu')}</Text>

          {roomCode ? (
            <Pressable
              style={styles.codeBox}
              onPress={() => copyToClipboard(roomCode, t('code_copied'))}
            >
              <Text style={styles.codeLabel}>{t('room_code')}</Text>
              <Text style={styles.code}>{roomCode}</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.menuItem} onPress={onSave}>
            <Text style={styles.menuItemText}>
              {justSaved ? t('saved') : t('save_game')}
            </Text>
          </Pressable>

          <Pressable style={styles.menuItem} onPress={onRestart}>
            <Text style={styles.menuItemText}>{t('restart')}</Text>
          </Pressable>

          {onNames ? (
            <Pressable style={styles.menuItem} onPress={onNames}>
              <Text style={styles.menuItemText}>{t('menu_names')}</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.menuItem} onPress={onRules}>
            <Text style={styles.menuItemText}>📖  {t('rules')}</Text>
          </Pressable>

          <Pressable style={styles.menuItem} onPress={onSettings}>
            <Text style={styles.menuItemText}>{t('menu_settings')}</Text>
          </Pressable>

          <Pressable
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={onExit}
          >
            <Text style={[styles.menuItemText, styles.menuItemDangerText]}>
              {t('exit')}
            </Text>
          </Pressable>

          <Pressable style={styles.menuClose} onPress={onClose}>
            <Text style={styles.menuCloseText}>{t('continue_game')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: 280,
    gap: 10,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 6,
  },
  codeBox: {
    backgroundColor: '#E8F1FC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E88E5',
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0D47A1',
    letterSpacing: 6,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474F',
  },
  menuItemDanger: {
    backgroundColor: '#FDECEA',
  },
  menuItemDangerText: {
    color: '#C62828',
  },
  menuClose: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  menuCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E88E5',
  },
});
