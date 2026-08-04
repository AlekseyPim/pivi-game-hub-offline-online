import type { GameMode } from '@/games/battleship/types/game';

/** Classic 10×10 sea. */
export const BOARD_SIZE = 10;

/**
 * The classic Russian fleet: one 4-deck ship, two 3-deck, three 2-deck and four
 * single-deck boats — 10 ships covering 20 of the 100 cells.
 */
export const FLEET: number[] = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

/** Total ships in a full fleet. */
export const FLEET_COUNT = FLEET.length;

/** How many ships of each size the fleet holds, largest first. */
export const FLEET_BY_SIZE: { size: number; count: number }[] = [4, 3, 2, 1].map(
  (size) => ({ size, count: FLEET.filter((s) => s === size).length }),
);

export const GAME_MODES: GameMode[] = ['classic', 'moving'];

/** Online multiplayer is strictly two players — it's a duel. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

/**
 * Column captions. Cyrillic boards use the classic Russian lettering (which
 * skips Ё, Й and Л), Latin ones plain A…J — picked from the UI language, so the
 * captions are always in the script the player is reading.
 */
export const COLUMN_LABELS_CYRILLIC = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
export const COLUMN_LABELS_LATIN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function columnLabels(cyrillic: boolean): string[] {
  return cyrillic ? COLUMN_LABELS_CYRILLIC : COLUMN_LABELS_LATIN;
}

/** Cell index ⇄ coordinate helpers. All logic speaks in flat indices. */
export const idx = (row: number, col: number, size = BOARD_SIZE): number =>
  row * size + col;
export const rowOf = (index: number, size = BOARD_SIZE): number =>
  Math.floor(index / size);
export const colOf = (index: number, size = BOARD_SIZE): number => index % size;

/** Human-readable cell name, e.g. `Б7` (Cyrillic) or `B7` (Latin). */
export function cellName(
  index: number,
  size = BOARD_SIZE,
  cyrillic = true,
): string {
  const label = columnLabels(cyrillic)[colOf(index, size)] ?? '?';
  return `${label}${rowOf(index, size) + 1}`;
}
