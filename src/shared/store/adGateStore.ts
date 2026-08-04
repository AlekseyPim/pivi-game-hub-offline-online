import { create } from 'zustand';

/**
 * Whether a full-screen ad is currently being fetched, so the UI can say so.
 *
 * Waiting for an ad to load takes a second or two, and during that time the app
 * looks frozen: the button was tapped and nothing happened. This tiny store lets
 * the ad service raise a global overlay for exactly that window — see
 * `components/AdGateOverlay`.
 */
interface AdGateStore {
  /** True while an ad request is in flight and the game start is held back. */
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAdGateStore = create<AdGateStore>((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
