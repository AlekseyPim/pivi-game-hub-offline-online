import { create } from 'zustand';

/**
 * Tiny trigger store for the global fireworks overlay. `celebrate` bumps a new
 * celebration (the id forces a fresh replay); the overlay plays the burst and
 * then `clear`s.
 *
 * The overlay is mounted once, above every screen, so the salute has to cover
 * what each game wants from it: a rainbow burst by default, a gold-dominant one
 * for supporters, the winner's colour in ludo, hearts for its heart-named
 * player. A game passes those as options rather than shipping its own overlay.
 */

export interface CelebrationOptions {
  /** Denser, gold-dominant burst — a supporter-only victory perk. */
  gold?: boolean;
  /**
   * Particle palette; each particle picks one entry at random, so repeating an
   * entry weights it. Falls back to the rainbow (or gold) default.
   */
  tints?: readonly string[];
  /** Rain hearts instead of sparks. */
  heart?: boolean;
}

export interface Celebration extends CelebrationOptions {
  id: number;
  gold: boolean;
}

interface FireworksStore {
  celebration: Celebration | null;
  celebrate: (opts?: CelebrationOptions) => void;
  clear: () => void;
}

let counter = 0;

export const useFireworksStore = create<FireworksStore>((set) => ({
  celebration: null,
  celebrate: (opts = {}) => {
    counter += 1;
    set({ celebration: { ...opts, id: counter, gold: Boolean(opts.gold) } });
  },
  clear: () => set({ celebration: null }),
}));
