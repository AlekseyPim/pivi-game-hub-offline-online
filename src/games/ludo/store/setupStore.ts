import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { COLOR_ORDER } from '@/games/ludo/constants/board';
import type { PlayerColor, PlayerType } from '@/games/ludo/types/game';

/**
 * Persisted pre-game setup: which colours play (their count is the number of
 * players, 2..4), the per-colour names and whether each is a human or a bot.
 * Kept separate from the live game (gameStore) so lobby choices survive an app
 * restart and never interfere with an in-progress match. Always keeps at least
 * one human among the selected colours.
 */

const SETUP_KEY = 'ludo:setup:v1';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

export type PlayerNames = Record<PlayerColor, string>;
export type PlayerTypes = Record<PlayerColor, PlayerType>;

const DEFAULT_NAMES: PlayerNames = {
  red: '',
  green: '',
  yellow: '',
  blue: '',
};

const DEFAULT_TYPES: PlayerTypes = {
  red: 'human',
  green: 'human',
  yellow: 'human',
  blue: 'human',
};

const DEFAULT_COLORS: PlayerColor[] = COLOR_ORDER.slice(0, MIN_PLAYERS);

interface SetupState {
  /** Chosen colours, always kept in canonical COLOR_ORDER; length 2..4. */
  colors: PlayerColor[];
  names: PlayerNames;
  types: PlayerTypes;
  hydrated: boolean;
}

interface SetupActions {
  toggleColor: (color: PlayerColor) => void;
  setName: (color: PlayerColor, name: string) => void;
  togglePlayerType: (color: PlayerColor) => void;
  hydrate: () => Promise<void>;
}

export type SetupStore = SetupState & SetupActions;

/** Re-order an arbitrary colour set into the canonical board order. */
function canonical(colors: PlayerColor[]): PlayerColor[] {
  return COLOR_ORDER.filter((c) => colors.includes(c));
}

/** Guarantee at least one selected colour is human (forces the first if not). */
function ensureOneHuman(colors: PlayerColor[], types: PlayerTypes): PlayerTypes {
  if (colors.length === 0) return types;
  if (colors.some((c) => types[c] === 'human')) return types;
  return { ...types, [colors[0]]: 'human' };
}

export const useSetupStore = create<SetupStore>((set, get) => {
  const persist = () => {
    const { colors, names, types } = get();
    void AsyncStorage.setItem(
      SETUP_KEY,
      JSON.stringify({ colors, names, types }),
    );
  };

  return {
    colors: DEFAULT_COLORS,
    names: DEFAULT_NAMES,
    types: DEFAULT_TYPES,
    hydrated: false,

    toggleColor: (color) => {
      const { colors, types } = get();
      let nextColors: PlayerColor[];
      if (colors.includes(color)) {
        // Removing — but never drop below the minimum number of players.
        if (colors.length <= MIN_PLAYERS) return;
        nextColors = colors.filter((c) => c !== color);
      } else {
        if (colors.length >= MAX_PLAYERS) return;
        nextColors = canonical([...colors, color]);
      }
      set({ colors: nextColors, types: ensureOneHuman(nextColors, types) });
      persist();
    },

    setName: (color, name) => {
      set({ names: { ...get().names, [color]: name } });
      persist();
    },

    togglePlayerType: (color) => {
      const { colors, types } = get();
      const next: PlayerType = types[color] === 'bot' ? 'human' : 'bot';
      if (next === 'bot') {
        // Keep at least one human among the selected colours.
        const otherHuman = colors.some(
          (c) => c !== color && types[c] === 'human',
        );
        if (!otherHuman) return;
      }
      set({ types: { ...types, [color]: next } });
      persist();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SETUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SetupState>;
          const restored = Array.isArray(parsed.colors)
            ? canonical(parsed.colors)
            : [];
          const colors =
            restored.length >= MIN_PLAYERS && restored.length <= MAX_PLAYERS
              ? restored
              : DEFAULT_COLORS;
          const names: PlayerNames = { ...DEFAULT_NAMES, ...(parsed.names ?? {}) };
          const types = ensureOneHuman(colors, {
            ...DEFAULT_TYPES,
            ...(parsed.types ?? {}),
          });
          set({ colors, names, types, hydrated: true });
          return;
        }
      } catch {
        // Corrupt setup falls back to defaults.
      }
      set({ hydrated: true });
    },
  };
});
