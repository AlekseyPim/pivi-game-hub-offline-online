import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * A single short buzz when a shell finds a hull — whether we scored the hit or
 * took it. Misses stay silent on purpose: they are by far the commonest outcome,
 * and buzzing on every one turns the feedback into noise instead of a signal.
 *
 * Sinking a ship gets the heavier thud, still one short tap rather than a
 * pattern. Silently does nothing on web, on a simulator (no Taptic Engine) or
 * when the player switched vibration off in Settings.
 */
export function shotFeedback(outcome: 'miss' | 'hit' | 'sunk'): void {
  if (outcome === 'miss') return;
  if (Platform.OS === 'web') return;
  if (!useSettingsStore.getState().haptics) return;
  try {
    void Haptics.impactAsync(
      outcome === 'sunk'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium,
    );
  } catch {
    // Haptics are a nicety — never let them break a turn.
  }
}
