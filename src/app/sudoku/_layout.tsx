import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSaveStore } from '@/games/sudoku/store/saveStore';
import { useSetupStore } from '@/games/sudoku/store/setupStore';

/**
 * Sudoku's own shell. Its save slot and setup are read from disk the first time
 * the game is opened rather than at app launch, and the "we're back" ping that
 * revives an online match is scoped here too — nothing sudoku-shaped should run
 * while the player is looking at the hub or at another game.
 */
export default function SudokuLayout() {
  const hydrateSetup = useSetupStore((s) => s.hydrate);
  const hydrateSave = useSaveStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSetup();
    void hydrateSave();
  }, [hydrateSetup, hydrateSave]);

  // Returning from the background: re-announce presence so an online match
  // reconnects and any "opponent left" warning clears.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Imported lazily: the online store pulls in Supabase, and a player who
      // only ever plays solo should not pay for that on every foreground.
      void import('@/games/sudoku/store/onlineStore').then(({ useOnlineStore }) =>
        useOnlineStore.getState().reannounce(),
      );
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game" options={{ gestureEnabled: false }} />
      <Stack.Screen name="online" />
      <Stack.Screen name="rules" />
    </Stack>
  );
}
