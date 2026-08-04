import { LIVES_BY_DIFFICULTY } from '@/games/minesweeper/constants/board';
import type {
  Cell,
  Difficulty,
  GameState,
  PlayerConfig,
  TurnMode,
} from '@/games/minesweeper/types/game';

/**
 * Board construction. The only place randomness enters the game — so it runs
 * exactly once, on the local device (single-player) or the host (online), and
 * the resulting {@link GameState} is what everyone else renders. This mirrors
 * ludo-game injecting the authoritative die: guests never roll their own board.
 */

export interface CreateGameOptions {
  size: number;
  mines: number;
  difficulty: Difficulty;
  turnMode: TurnMode;
  players: PlayerConfig[];
}

/** Fisher–Yates shuffle of 0..n-1. */
function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deal each cell to a player so shares are as equal as possible, at random. */
function assignOwners(total: number, playerCount: number): number[] {
  const owners = new Array<number>(total);
  const order = shuffledIndices(total);
  order.forEach((cellIndex, k) => {
    owners[cellIndex] = k % playerCount;
  });
  return owners;
}

function neighbours(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      out.push(r * size + c);
    }
  }
  return out;
}

/** (Re)compute every cell's neighbouring-mine count in place. */
export function recomputeAdjacency(cells: Cell[], size: number): void {
  for (const cell of cells) {
    if (cell.mine) {
      cell.adjacent = 0;
      continue;
    }
    let n = 0;
    for (const nb of neighbours(cell.index, size)) {
      if (cells[nb].mine) n++;
    }
    cell.adjacent = n;
  }
}

export function neighboursOf(index: number, size: number): number[] {
  return neighbours(index, size);
}

export function createGame(opts: CreateGameOptions): GameState {
  const { size, difficulty, turnMode, players } = opts;
  const total = size * size;
  const mines = Math.min(opts.mines, total - 1);

  const owners = assignOwners(total, players.length);
  const mineSet = new Set(shuffledIndices(total).slice(0, mines));

  const cells: Cell[] = Array.from({ length: total }, (_, index) => ({
    index,
    row: Math.floor(index / size),
    col: index % size,
    mine: mineSet.has(index),
    adjacent: 0,
    state: 'hidden' as const,
    mark: 'none' as const,
    owner: owners[index],
  }));
  recomputeAdjacency(cells, size);

  return {
    size,
    mines,
    difficulty,
    turnMode,
    cells,
    players: players.map((p) => ({ name: p.name })),
    phase: 'playing',
    livesLeft: LIVES_BY_DIFFICULTY[difficulty],
    currentPlayerIndex: 0,
    moveCounts: players.map(() => 0),
    firstMoveDone: players.map(() => false),
    revealedSafe: 0,
    safeTarget: total - mines,
  };
}
