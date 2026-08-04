import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePrefsStore } from '@/games/ludo/store/prefsStore';
import { useSetupStore } from '@/games/ludo/store/setupStore';

/**
 * Ludo's own shell. Its roster of remembered players and its fast-mode
 * preference are read from disk the first time the game is opened rather than
 * at app launch, and the "we're back" ping that revives an online match is
 * scoped here too.
 */
export default function LudoLayout() {
  const hydrateSetup = useSetupStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSetup();
    void hydratePrefs();
  }, [hydrateSetup, hydratePrefs]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Imported lazily: the online store pulls in Supabase, and a player who
      // only ever plays against bots should not pay for that on every foreground.
      void import('@/games/ludo/store/onlineStore').then(({ useOnlineStore }) =>
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
      <Stack.Screen name="names" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
