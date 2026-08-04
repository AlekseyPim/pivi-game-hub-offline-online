import { BOARD_SIZE, FLEET, colOf, idx, rowOf } from '@/games/battleship/constants/board';
import {
  canFireAt,
  canMoveShip,
  MOVE_KINDS,
  movedTo,
  type MoveKind,
} from '@/games/battleship/logic/gameReducer';
import { cellsAt, ringOf } from '@/games/battleship/logic/placement';
import type { Board, GameMode, Ship } from '@/games/battleship/types/game';

/**
 * The computer opponent for local games — a classic "hunt / target" gunner.
 *
 * It is deliberately STATELESS: every decision is derived from the markers on
 * the board it is shooting at, never from the ships hidden underneath. That
 * keeps it honest (it cannot peek at the player's fleet even though the local
 * game state holds both boards) and means a saved game resumes with the bot's
 * reasoning fully intact.
 */

/**
 * How far around a dimmed hit the bot will look for the ship that sailed off.
 * A move is exactly one cell, so the deck that sat on that marker is now on one
 * of its four orthogonal neighbours — those are probed first. The second ring
 * only matters once the ship has had time to move again.
 */
const SEARCH_RADIUS = 2;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Orthogonal neighbours of a cell that are still worth firing at. */
function neighbours(
  cell: number,
  size: number,
  open: (cell: number) => boolean,
): number[] {
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  const out: number[] = [];
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
    const n = idx(nr, nc, size);
    if (open(n)) out.push(n);
  }
  return out;
}

/** Live hits: a wounded ship is still sitting there, waiting to be finished. */
function activeHits(board: Board): number[] {
  const out: number[] = [];
  board.marks.forEach((mark, cell) => {
    if (mark === 'hit') out.push(cell);
  });
  return out;
}

/**
 * Sizes of the wrecks already ringed on this board, read back from the `sunk`
 * markers — that's how the bot knows which ships are still out there.
 */
function sunkSizes(board: Board, size: number): number[] {
  const seen = new Set<number>();
  const sizes: number[] = [];
  board.marks.forEach((mark, cell) => {
    if (mark !== 'sunk' || seen.has(cell)) return;
    // Flood the wreck (ships are straight, but a flood fill is simplest).
    const stack = [cell];
    let count = 0;
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current) || board.marks[current] !== 'sunk') continue;
      seen.add(current);
      count += 1;
      const r = rowOf(current, size);
      const c = colOf(current, size);
      if (r > 0) stack.push(idx(r - 1, c, size));
      if (r < size - 1) stack.push(idx(r + 1, c, size));
      if (c > 0) stack.push(idx(r, c - 1, size));
      if (c < size - 1) stack.push(idx(r, c + 1, size));
    }
    sizes.push(count);
  });
  return sizes;
}

/** The smallest ship the bot believes is still afloat (1 when unsure). */
function smallestAfloat(board: Board, size: number): number {
  const left = [...FLEET];
  for (const sunk of sunkSizes(board, size)) {
    const at = left.indexOf(sunk);
    if (at >= 0) left.splice(at, 1);
  }
  return left.length ? Math.min(...left) : 1;
}

/**
 * Pick the next cell to fire at, or null when there is nothing left to shoot.
 *
 *  1. Finish a wounded ship: extend a line of live hits, or probe around one.
 *  2. Hunt on a diagonal lattice sized to the smallest ship still afloat — the
 *     classic way to sweep an unexplored board with the fewest shots.
 *  3. Movement mode: chase the ships that ran — a dimmed marker says exactly
 *     where one of them was a moment ago.
 */
export function chooseShot(
  board: Board,
  size = BOARD_SIZE,
  mode: GameMode = 'classic',
): number | null {
  // A marker is final in both modes, so "worth shooting" is simply "never shot".
  const open = (cell: number) => canFireAt(board, cell);

  const hits = activeHits(board);
  if (hits.length) {
    // Group the hits into straight clusters and work on the first one found.
    const anchor = hits[0];
    const line = hits.filter((cell) => rowOf(cell, size) === rowOf(anchor, size));
    const column = hits.filter((cell) => colOf(cell, size) === colOf(anchor, size));

    const along = (cells: number[], horizontal: boolean): number[] => {
      if (cells.length < 2) return [];
      const sorted = [...cells].sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const step = horizontal ? 1 : size;
      const ends: number[] = [];
      const before = first - step;
      const after = last + step;
      const sameRow = (a: number, b: number) => rowOf(a, size) === rowOf(b, size);
      if (before >= 0 && (!horizontal || sameRow(before, first))) ends.push(before);
      if (after < size * size && (!horizontal || sameRow(after, last))) ends.push(after);
      return ends.filter(open);
    };

    const ends = [...along(line, true), ...along(column, false)];
    if (ends.length) return pick(ends);

    for (const hit of hits) {
      const around = neighbours(hit, size, open);
      if (around.length) return pick(around);
    }
  }

  // Movement mode: a dimmed marker is a lead, not a dead end. Whichever way the
  // ship went, it went exactly one cell — so the deck that was sitting on that
  // marker is now on one of the four cells orthogonally next to it. Those get
  // swept first; the wider ring is the fallback for a ship that has since moved
  // on again. Cells carrying a hit marker are skipped for free: no ship may
  // enter shelled water, so they cannot be hiding there.
  if (mode === 'moving') {
    const dimmed: number[] = [];
    board.marks.forEach((mark, cell) => {
      if (mark === 'hitStale') dimmed.push(cell);
    });
    if (dimmed.length) {
      const rings: Set<number>[] = [new Set<number>(), new Set<number>()];
      for (const cell of dimmed) {
        const r = rowOf(cell, size);
        const c = colOf(cell, size);
        for (let dr = -SEARCH_RADIUS; dr <= SEARCH_RADIUS; dr++) {
          for (let dc = -SEARCH_RADIUS; dc <= SEARCH_RADIUS; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
            const n = idx(nr, nc, size);
            if (!open(n)) continue;
            // One orthogonal step away is where the ship must be right now.
            const adjacent = Math.abs(dr) + Math.abs(dc) === 1;
            rings[adjacent ? 0 : 1].add(n);
          }
        }
      }
      for (const ring of rings) {
        if (ring.size) return pick([...ring]);
      }
    }
  }

  const candidates: number[] = [];
  board.marks.forEach((_, cell) => {
    if (open(cell)) candidates.push(cell);
  });
  if (!candidates.length) return null;

  const step = smallestAfloat(board, size);
  const lattice = candidates.filter(
    (cell) => (rowOf(cell, size) + colOf(cell, size)) % step === 0,
  );
  return pick(lattice.length ? lattice : candidates);
}

/**
 * Movement mode: decide whether to sail a ship before shooting.
 *
 * A wounded ship almost always runs — that is the whole point of the mode, and
 * it dims the marker the enemy worked for. Where it runs to matters just as
 * much: the markers on our own sea are exactly what the enemy has already
 * learned, so the bot steers towards the water they have not touched, and
 * prefers a berth that is not hemmed in. Intact ships shuffle now and then to
 * keep the formation from being read off a single lucky salvo.
 */
export function chooseShipMove(
  board: Board,
  size = BOARD_SIZE,
): { shipId: string; kind: MoveKind } | null {
  /**
   * How inviting a berth is: unexplored water around the new position, minus a
   * penalty for hugging the enemy's known hits. Higher is safer.
   */
  const score = (ship: Ship, kind: MoveKind): number => {
    const next = movedTo(ship, kind);
    const cells = cellsAt(ship.size, next.row, next.col, ship.orientation, size);
    if (!cells) return -Infinity;
    const around = new Set([...cells, ...ringOf(cells, size)]);
    let value = 0;
    for (const cell of around) {
      const mark = board.marks[cell];
      if (mark === 'none') value += 1;
      else if (mark === 'miss') value -= 1;
      else value -= 2; // hit / dimmed hit / wreck: dead water, and a clue too
    }
    return value;
  };

  const best = (ship: Ship): { shipId: string; kind: MoveKind } | null => {
    const legal = MOVE_KINDS.filter((kind) => canMoveShip(board, ship, kind, size));
    if (!legal.length) return null;
    const ranked = legal
      .map((kind) => ({ kind, value: score(ship, kind) }))
      .sort((a, b) => b.value - a.value);
    // Keep it slightly unpredictable: any move within one point of the best.
    const top = ranked.filter((m) => m.value >= ranked[0].value - 1);
    return { shipId: ship.id, kind: pick(top).kind };
  };

  const wounded = board.ships.filter((s) => !s.sunk && s.hits.some(Boolean));
  for (const ship of wounded) {
    if (Math.random() > 0.85) continue;
    const move = best(ship);
    if (move) return move;
  }

  if (Math.random() > 0.2) return null;
  const afloat = board.ships.filter((s) => !s.sunk);
  if (!afloat.length) return null;
  return best(pick(afloat));
}
