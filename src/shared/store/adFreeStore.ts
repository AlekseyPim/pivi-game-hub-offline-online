import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Device-level "ads removed" flag, unlocked by entering the secret code (see
 * `constants/ads.ts` and `UnlockCodeModal`). Mirrored into AsyncStorage so the
 * ad-free state is available instantly and offline on the next launch.
 */

const AD_FREE_KEY = 'hub:adfree:v1';

interface AdFreeState {
  /** True once the correct unlock code has been entered on this device. */
  adFree: boolean;
  /** False until the persisted value has been read back at startup. */
  hydrated: boolean;
}

interface AdFreeActions {
  /** Grant permanent ad-free status. Idempotent. */
  unlock: () => void;
  hydrate: () => Promise<void>;
}

export type AdFreeStore = AdFreeState & AdFreeActions;

export const useAdFreeStore = create<AdFreeStore>((set) => ({
  adFree: false,
  hydrated: false,

  unlock: () => {
    set({ adFree: true });
    void AsyncStorage.setItem(AD_FREE_KEY, '1');
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(AD_FREE_KEY);
      set({ adFree: raw === '1', hydrated: true });
    } catch {
      // Unreadable state falls back to "ads on".
      set({ hydrated: true });
    }
  },
}));
