import { create } from 'zustand';

import type { PlayerColor } from '@/games/ludo/types/game';

/**
 * Fleeting emoji reactions shown over a player's base during online play. Each
 * `show` replaces that colour's current emoji and auto-clears after a few
 * seconds (a fresh tap restarts the timer via a new id).
 */

const DURATION_MS = 4000;

interface Reaction {
  emoji: string;
  id: number;
}

interface ReactionsStore {
  reactions: Partial<Record<PlayerColor, Reaction>>;
  show: (color: PlayerColor, emoji: string) => void;
}

let counter = 0;

export const useReactionsStore = create<ReactionsStore>((set, get) => ({
  reactions: {},
  show: (color, emoji) => {
    counter += 1;
    const id = counter;
    set((s) => ({ reactions: { ...s.reactions, [color]: { emoji, id } } }));
    setTimeout(() => {
      if (get().reactions[color]?.id !== id) return; // superseded by a newer tap
      set((s) => {
        const next = { ...s.reactions };
        delete next[color];
        return { reactions: next };
      });
    }, DURATION_MS);
  },
}));
