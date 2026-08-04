import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { usePrefsStore } from '@/games/battleship/store/prefsStore';
import { useSaveStore } from '@/games/battleship/store/saveStore';
import { useSetupStore } from '@/games/battleship/store/setupStore';

/**
 * Battleship's own shell. Its save slot, setup and water palette are read from
 * disk the first time the game is opened rather than at app launch.
 *
 * Unlike sudoku and minesweeper there is no foreground re-announce here: this
 * game keeps state on both devices instead of mirroring a host snapshot, so a
 * returning player picks up from their own board without a ping.
 */
export default function BattleshipLayout() {
  const hydrateSetup = useSetupStore((s) => s.hydrate);
  const hydrateSave = useSaveStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSetup();
    void hydrateSave();
    void hydratePrefs();
  }, [hydrateSetup, hydrateSave, hydratePrefs]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game" options={{ gestureEnabled: false }} />
      <Stack.Screen name="online" />
      <Stack.Screen name="rules" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
