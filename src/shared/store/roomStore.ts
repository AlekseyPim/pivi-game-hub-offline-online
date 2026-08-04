import { create } from 'zustand';

/**
 * The one online room the player is currently in, whichever game owns it.
 *
 * Each game keeps its own `onlineStore` — the lobby, the seats, the protocol are
 * all game-specific — but two shared screens need to know that *a* room is open
 * without knowing whose it is: the settings screen shows the code (the lobby is
 * long gone once a match starts) and the hub greys out "leave the game" traps.
 * Games call {@link enterRoom} / {@link leaveRoom} alongside their own state.
 */

interface RoomStore {
  /** Id of the game that owns the room, e.g. `sudoku`. Null when idle. */
  gameId: string | null;
  /** The room code to show and copy. Null when idle. */
  code: string | null;
  enterRoom: (gameId: string, code: string) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  gameId: null,
  code: null,
  enterRoom: (gameId, code) => set({ gameId, code }),
  leaveRoom: () => set({ gameId: null, code: null }),
}));
