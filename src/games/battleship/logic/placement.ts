import { BOARD_SIZE, FLEET, colOf, idx, rowOf } from '@/games/battleship/constants/board';
import type { Board, Orientation, Ship } from '@/games/battleship/types/game';

/**
 * Fleet geometry and the "ships may not touch" rule — shared by the placement
 * screen, the random auto-arrange and the movement mode's legality checks.
 *
 * Everything here is pure and works on flat cell indices.
 */

let shipCounter = 0;

/** Create an undamaged ship. Ids only need to be unique inside one board. */
export function makeShip(
  size: number,
  row: number,
  col: number,
  orientation: Orientation,
): Ship {
  shipCounter += 1;
  return {
    id: `s${shipCounter}`,
    size,
    row,
    col,
    orientation,
    hits: Array.from({ length: size }, () => false),
    sunk: false,
  };
}

/** The cells a ship of `shipSize` would occupy, or null if it leaves the board. */
export function cellsAt(
  shipSize: number,
  row: number,
  col: number,
  orientation: Orientation,
  size = BOARD_SIZE,
): number[] | null {
  if (row < 0 || col < 0) return null;
  const lastRow = orientation === 'v' ? row + shipSize - 1 : row;
  const lastCol = orientation === 'h' ? col + shipSize - 1 : col;
  if (lastRow >= size || lastCol >= size) return null;
  return Array.from({ length: shipSize }, (_, i) =>
    orientation === 'h' ? idx(row, col + i, size) : idx(row + i, col, size),
  );
}

/** The cells a ship currently occupies. */
export function shipCells(ship: Ship, size = BOARD_SIZE): number[] {
  return cellsAt(ship.size, ship.row, ship.col, ship.orientation, size) ?? [];
}

/** The 8-neighbourhood ring around a set of cells (excluding the cells). */
export function ringOf(cells: number[], size = BOARD_SIZE): number[] {
  const own = new Set(cells);
  const ring = new Set<number>();
  for (const cell of cells) {
    const r = rowOf(cell, size);
    const c = colOf(cell, size);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
        const n = idx(nr, nc, size);
        if (!own.has(n)) ring.add(n);
      }
    }
  }
  return [...ring];
}

/** Every cell occupied by any of `ships`. */
export function occupiedCells(ships: Ship[], size = BOARD_SIZE): Set<number> {
  const set = new Set<number>();
  for (const ship of ships) {
    for (const cell of shipCells(ship, size)) set.add(cell);
  }
  return set;
}

/**
 * True when `cells` is a legal berth: on the board (guaranteed by the caller
 * passing non-null cells) and neither overlapping nor touching another ship —
 * diagonals included. `ignoreId` skips the ship being moved / re-placed.
 */
export function cellsAreFree(
  cells: number[],
  ships: Ship[],
  size = BOARD_SIZE,
  ignoreId?: string,
): boolean {
  const blocked = new Set<number>();
  for (const ship of ships) {
    if (ship.id === ignoreId) continue;
    const own = shipCells(ship, size);
    for (const cell of own) blocked.add(cell);
    for (const cell of ringOf(own, size)) blocked.add(cell);
  }
  return cells.every((cell) => !blocked.has(cell));
}

/** Convenience: can a ship of `shipSize` be berthed at this bow + heading? */
export function canPlace(
  ships: Ship[],
  shipSize: number,
  row: number,
  col: number,
  orientation: Orientation,
  size = BOARD_SIZE,
  ignoreId?: string,
): boolean {
  const cells = cellsAt(shipSize, row, col, orientation, size);
  if (!cells) return false;
  return cellsAreFree(cells, ships, size, ignoreId);
}

/** Which ship (if any) covers a cell. */
export function shipAt(
  ships: Ship[],
  cell: number,
  size = BOARD_SIZE,
): Ship | null {
  return ships.find((ship) => shipCells(ship, size).includes(cell)) ?? null;
}

/** An empty sea with no ships and no shots. */
export function emptyBoard(size = BOARD_SIZE, known = true): Board {
  return {
    ships: [],
    marks: Array.from({ length: size * size }, () => 'none' as const),
    shipsLeft: 0,
    known,
  };
}

/**
 * Randomly arrange a full fleet, largest ships first (they are the hardest to
 * fit). Falls back to a fresh attempt if a ship can't be berthed, which is
 * vanishingly rare on a 10×10 board but keeps the function total.
 */
export function randomFleet(size = BOARD_SIZE): Ship[] {
  for (let attempt = 0; attempt < 100; attempt++) {
    const ships: Ship[] = [];
    let failed = false;
    for (const shipSize of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 400 && !placed; tries++) {
        const orientation: Orientation = Math.random() < 0.5 ? 'h' : 'v';
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (!canPlace(ships, shipSize, row, col, orientation, size)) continue;
        ships.push(makeShip(shipSize, row, col, orientation));
        placed = true;
      }
      if (!placed) {
        failed = true;
        break;
      }
    }
    if (!failed) return ships;
  }
  // Deterministic fallback — dense rows, still legal (never reached in practice).
  const ships: Ship[] = [];
  let row = 0;
  for (const shipSize of FLEET) {
    for (let col = 0; col + shipSize <= size; col++) {
      if (canPlace(ships, shipSize, row, col, 'h', size)) {
        ships.push(makeShip(shipSize, row, col, 'h'));
        break;
      }
    }
    row = (row + 2) % size;
  }
  return ships;
}

/** A board with a full, freshly-arranged random fleet. */
export function randomBoard(size = BOARD_SIZE): Board {
  const ships = randomFleet(size);
  return { ...emptyBoard(size), ships, shipsLeft: ships.length };
}

/** Ships of the full fleet still waiting to be placed, largest first. */
export function remainingFleet(ships: Ship[]): number[] {
  const left = [...FLEET];
  for (const ship of ships) {
    const at = left.indexOf(ship.size);
    if (at >= 0) left.splice(at, 1);
  }
  return left.sort((a, b) => b - a);
}

/** True once every ship of the classic fleet is on the board. */
export function fleetComplete(ships: Ship[]): boolean {
  return remainingFleet(ships).length === 0;
}
