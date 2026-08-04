import { create } from 'zustand';

/**
 * Fleeting emoji reactions exchanged during an online duel. Each `show`
 * replaces the current bubble and auto-clears after a few seconds; `mine` tells
 * the UI which side of the screen to float it on.
 */

const DURATION_MS = 3500;

export interface Reaction {
  id: number;
  emoji: string;
  /** True when we sent it ourselves. */
  mine: boolean;
}

interface ReactionsStore {
  reaction: Reaction | null;
  show: (emoji: string, mine: boolean) => void;
  clear: () => void;
}

let counter = 0;

export const useReactionsStore = create<ReactionsStore>((set, get) => ({
  reaction: null,
  show: (emoji, mine) => {
    counter += 1;
    const id = counter;
    set({ reaction: { id, emoji, mine } });
    setTimeout(() => {
      if (get().reaction?.id !== id) return; // superseded by a newer one
      set({ reaction: null });
    }, DURATION_MS);
  },
  clear: () => set({ reaction: null }),
}));
