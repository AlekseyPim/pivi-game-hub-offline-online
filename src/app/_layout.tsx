import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initAds } from '@/shared/ads/adService';
import { AdGateOverlay } from '@/shared/components/AdGateOverlay';
import { FireworksOverlay } from '@/shared/components/Fireworks';
import { SplashGate } from '@/shared/components/SplashGate';
import { getTheme } from '@/shared/constants/theme';
import { useAdFreeStore } from '@/shared/store/adFreeStore';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useSupporterStore } from '@/shared/store/supporterStore';

/**
 * App-wide shell. Only what every game needs lives here: the persisted
 * preferences, the device-wide monetization flags, the ad SDK, the splash and
 * the two full-screen overlays. Anything a single game has to load — its save
 * slot, its setup, its online session — is hydrated by that game's own layout,
 * so opening the hub does not pay for four games at once.
 */
export default function RootLayout() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateAdFree = useAdFreeStore((s) => s.hydrate);
  const hydrateSupporter = useSupporterStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateSettings();
    void hydrateAdFree();
    void hydrateSupporter();
    initAds();
  }, [hydrateSettings, hydrateAdFree, hydrateSupporter]);

  // Paint the navigator chrome with the app theme so screen transitions never
  // flash a white window behind a dark screen.
  const background = getTheme(darkMode).background;
  const base = darkMode ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background } };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: background }}>
      <ThemeProvider value={navTheme}>
        <SplashGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="agreement" />
            <Stack.Screen name="thanks" />
            <Stack.Screen name="sudoku" />
            <Stack.Screen name="minesweeper" />
            <Stack.Screen name="battleship" />
            <Stack.Screen name="ludo" />
          </Stack>
        </SplashGate>
        <FireworksOverlay />
        <AdGateOverlay />
        <StatusBar style={darkMode ? 'light' : 'auto'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
