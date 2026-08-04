import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AdBanner } from '@/shared/components/AdBanner';
import { SHOW_START_MODAL_BANNER } from '@/shared/constants/ads';
import { COLOR_HEX } from '@/games/ludo/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/games/ludo/i18n/useT';
import type { PlayerNames, PlayerTypes } from '@/games/ludo/store/setupStore';
import type { PlayerColor } from '@/games/ludo/types/game';

const NAME_MAX_LENGTH = 16;

interface StartGameModalProps {
  visible: boolean;
  /** Colours in play, in turn order. */
  colors: PlayerColor[];
  names: PlayerNames;
  types: PlayerTypes;
  onSetName: (color: PlayerColor, name: string) => void;
  onStart: () => void;
  onClose: () => void;
}

/**
 * Pre-game confirmation: shows the line-up (player count, each colour and its
 * name) and lets the names be edited inline before the match begins.
 */
export function StartGameModal({
  visible,
  colors,
  names,
  types,
  onSetName,
  onStart,
  onClose,
}: StartGameModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Mount the body only while open so its draft seeds fresh from `names`. */}
      {visible && (
        <StartGameBody
          colors={colors}
          names={names}
          types={types}
          onSetName={onSetName}
          onStart={onStart}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

type StartGameBodyProps = Omit<StartGameModalProps, 'visible'>;

function StartGameBody({
  colors,
  names,
  types,
  onSetName,
  onStart,
  onClose,
}: StartGameBodyProps) {
  const theme = useTheme();
  const t = useT();

  // Edit against a local draft so typing stays smooth; write through to the
  // store on every keystroke. Seeded once on mount (i.e. each time it opens).
  const [draft, setDraft] = useState<PlayerNames>(names);

  const update = (color: PlayerColor, text: string) => {
    setDraft((prev) => ({ ...prev, [color]: text }));
    onSetName(color, text);
  };

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.card, { backgroundColor: theme.card }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('players_count', { n: colors.length })}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('check_lineup')}
          </Text>

          {colors.map((color) => (
            <View key={color} style={styles.row}>
              <View
                style={[styles.swatch, { backgroundColor: COLOR_HEX[color] }]}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: theme.textPrimary, borderColor: COLOR_HEX[color] },
                ]}
                value={draft[color]}
                onChangeText={(text) => update(color, text)}
                placeholder={t(`color_${color}`)}
                placeholderTextColor={theme.textSecondary}
                maxLength={NAME_MAX_LENGTH}
                returnKeyType="done"
              />
              <Text style={styles.typeBadge}>
                {types[color] === 'bot' ? '🤖' : '👤'}
              </Text>
            </View>
          ))}

          <Pressable style={styles.primaryButton} onPress={onStart}>
            <Text style={styles.primaryButtonText}>{t('start_game')}</Text>
          </Pressable>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>
              {t('cancel')}
            </Text>
          </Pressable>

          <AdBanner enabled={SHOW_START_MODAL_BANNER} />
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  typeBadge: {
    fontSize: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    width: 300,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    marginTop: 10,
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
  close: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
