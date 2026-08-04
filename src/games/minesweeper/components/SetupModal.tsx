import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AdBanner } from '@/shared/components/AdBanner';
import { Segmented } from '@/shared/components/Segmented';
import { Slider } from '@/shared/components/Slider';
import {
  BOARD_SIZES,
  DIFFICULTIES,
  MAX_MINE_DENSITY,
  MIN_MINE_DENSITY,
  MINE_DENSITY_STEP,
  minesForSize,
} from '@/games/minesweeper/constants/board';
import { SHOW_SETUP_MODAL_BANNER } from '@/shared/constants/ads';
import { useTheme } from '@/games/minesweeper/constants/theme';
import { useT } from '@/games/minesweeper/i18n/useT';
import { useSetupStore } from '@/games/minesweeper/store/setupStore';
import type { BoardSize, Difficulty } from '@/games/minesweeper/types/game';

interface SetupModalProps {
  visible: boolean;
  /** Label + action of the confirm button (e.g. "Play" / "Online"). */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Pre-game setup sheet: pick the board size, mine density and difficulty. Edits
 * the shared `setupStore`, so both the local "Play" flow and the online host
 * read the same choices. Shown before either entry point.
 */
export function SetupModal({ visible, confirmLabel, onConfirm, onClose }: SetupModalProps) {
  const theme = useTheme();
  const t = useT();

  const size = useSetupStore((s) => s.size);
  const difficulty = useSetupStore((s) => s.difficulty);
  const mineDensity = useSetupStore((s) => s.mineDensity);
  const setSize = useSetupStore((s) => s.setSize);
  const setDifficulty = useSetupStore((s) => s.setDifficulty);
  const setMineDensity = useSetupStore((s) => s.setMineDensity);

  const mines = minesForSize(size, mineDensity);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modals render outside the app's root, so gestures (the slider) need
          their own GestureHandlerRootView here. */}
      <GestureHandlerRootView style={styles.root}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stop taps inside the sheet from closing it. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.background }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('game_setup')}
          </Text>

          <Segmented<BoardSize>
            label={t('board_size')}
            options={BOARD_SIZES.map((s) => ({ value: s, label: `${s}×${s}` }))}
            value={size}
            onChange={setSize}
          />

          <View style={styles.mineBlock}>
            <View style={styles.mineHeader}>
              <Text style={[styles.mineLabel, { color: theme.textSecondary }]}>
                {t('mine_amount')}
              </Text>
              <Text style={[styles.mineValue, { color: theme.textPrimary }]}>
                💣 {mines}
                <Text style={{ color: theme.textSecondary }}>
                  {`   ×${mineDensity.toFixed(1)}`}
                </Text>
              </Text>
            </View>
            <Slider
              min={MIN_MINE_DENSITY}
              max={MAX_MINE_DENSITY}
              step={MINE_DENSITY_STEP}
              value={mineDensity}
              onChange={setMineDensity}
              theme={theme}
            />
          </View>

          <Segmented<Difficulty>
            label={t('difficulty')}
            options={DIFFICULTIES.map((d) => ({ value: d, label: t(d) }))}
            value={difficulty}
            onChange={setDifficulty}
            hint={difficulty === 'easy' ? t('easy_hint') : t('normal_hint')}
          />

          <Pressable style={styles.primaryButton} onPress={onConfirm}>
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onClose} hitSlop={6}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
              {t('close')}
            </Text>
          </Pressable>

          <AdBanner enabled={SHOW_SETUP_MODAL_BANNER} />
        </Pressable>
      </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
    gap: 18,
  },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  mineBlock: { gap: 2, alignSelf: 'stretch' },
  mineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mineLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  mineValue: { fontSize: 17, fontWeight: '800' },
  primaryButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
