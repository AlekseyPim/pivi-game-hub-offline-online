import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/constants/theme';

/**
 * Reaction picker shown when you tap a cell your opponent marked with "?".
 * The chosen emoji is flashed on that cell for both players.
 */

// thumbs up / down, dunno, laugh, angry, smile, heart (per the brief).
const EMOJIS = ['👍', '👎', '🤷', '😂', '😠', '🙂', '❤️'];

interface EmojiModalProps {
  visible: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiModal({ visible, onPick, onClose }: EmojiModalProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.card }]} onPress={() => {}}>
          <View style={styles.grid}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.cell}
                hitSlop={4}
                onPress={() => {
                  onPick(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { borderRadius: 20, padding: 12, maxWidth: 340 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cell: { width: 60, height: 56, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 34 },
});
