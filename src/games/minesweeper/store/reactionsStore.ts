import { create } from 'zustand';

/**
 * Fleeting emoji reactions pinned to a board cell during online play. Sent when
 * a player marks a cell "?" and the opponent taps it to react. Each `show`
 * replaces that cell's current emoji and auto-clears after a few seconds.
 */

const DURATION_MS = 4000;

interface Reaction {
  emoji: string;
  id: number;
}

interface ReactionsStore {
  reactions: Record<number, Reaction>;
  show: (index: number, emoji: string) => void;
  clear: () => void;
}

let counter = 0;

export const useReactionsStore = create<ReactionsStore>((set, get) => ({
  reactions: {},
  show: (index, emoji) => {
    counter += 1;
    const id = counter;
    set((s) => ({ reactions: { ...s.reactions, [index]: { emoji, id } } }));
    setTimeout(() => {
      if (get().reactions[index]?.id !== id) return; // superseded by a newer tap
      set((s) => {
        const next = { ...s.reactions };
        delete next[index];
        return { reactions: next };
      });
    }, DURATION_MS);
  },
  clear: () => set({ reactions: {} }),
}));
