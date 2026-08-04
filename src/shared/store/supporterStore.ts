import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Device-level "supporter" status, earned by buying the author a coffee
 * (identical to ludo-game). Unlocks only cosmetic thank-yous + ad-free, never
 * any gameplay advantage. Mirrored into AsyncStorage so it's available offline
 * and instantly, then reconciled with the store on restore.
 */

const SUPPORTER_KEY = 'hub:supporter:v1';

interface SupporterState {
  /** True once at least one coffee has been bought on this device. */
  isSupporter: boolean;
  /** How many coffees were bought in total. */
  coffeeCount: number;
  /** False until the persisted value has been read back at startup. */
  hydrated: boolean;
}

interface SupporterActions {
  /** Grant permanent supporter status (non-consumable unlock or restore). */
  markSupporter: () => void;
  /** Record one extra consumable coffee tip; implies supporter status. */
  addCoffee: () => void;
  hydrate: () => Promise<void>;
}

export type SupporterStore = SupporterState & SupporterActions;

export const useSupporterStore = create<SupporterStore>((set, get) => {
  const persist = () => {
    const { isSupporter, coffeeCount } = get();
    void AsyncStorage.setItem(
      SUPPORTER_KEY,
      JSON.stringify({ isSupporter, coffeeCount }),
    );
  };

  return {
    isSupporter: false,
    coffeeCount: 0,
    hydrated: false,

    markSupporter: () => {
      set((s) => ({ isSupporter: true, coffeeCount: Math.max(s.coffeeCount, 1) }));
      persist();
    },

    addCoffee: () => {
      set((s) => ({ isSupporter: true, coffeeCount: s.coffeeCount + 1 }));
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SUPPORTER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            isSupporter?: boolean;
            coffeeCount?: number;
          };
          const coffeeCount =
            typeof parsed.coffeeCount === 'number' && parsed.coffeeCount > 0
              ? Math.floor(parsed.coffeeCount)
              : 0;
          set({
            isSupporter: Boolean(parsed.isSupporter) || coffeeCount > 0,
            coffeeCount,
            hydrated: true,
          });
          return;
        }
      } catch {
        // Corrupt or unreadable state falls back to "not a supporter yet".
      }
      set({ hydrated: true });
    },
  };
});
