import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePrefsStore } from '@/games/minesweeper/store/prefsStore';
import { useSaveStore } from '@/games/minesweeper/store/saveStore';
import { useSetupStore } from '@/games/minesweeper/store/setupStore';

/**
 * Minesweeper's own shell. Its save slot, setup and board palette are read from
 * disk the first time the game is opened rather than at app launch, and the
 * "we're back" ping that revives an online match is scoped here too.
 */
export default function MinesweeperLayout() {
  const hydrateSetup = useSetupStore((s) => s.hydrate);
  const hydrateSave = useSaveStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSetup();
    void hydrateSave();
    void hydratePrefs();
  }, [hydrateSetup, hydrateSave, hydratePrefs]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Imported lazily: the online store pulls in Supabase, and a player who
      // only ever plays solo should not pay for that on every foreground.
      void import('@/games/minesweeper/store/onlineStore').then(({ useOnlineStore }) =>
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
      <Stack.Screen name="settings" />
    </Stack>
  );
}
