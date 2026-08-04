/**
 * The games the hub ships. Kept in its own module (rather than in the richer
 * `registry`, which pulls in images and translations) so that low-level things —
 * ad cadence, storage namespaces, Realtime room keys — can name a game without
 * dragging the UI layer in behind them.
 */

export const GAME_IDS = ['sudoku', 'minesweeper', 'battleship', 'ludo'] as const;

export type GameId = (typeof GAME_IDS)[number];
