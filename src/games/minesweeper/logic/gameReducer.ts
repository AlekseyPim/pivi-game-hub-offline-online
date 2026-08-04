import { neighboursOf, recomputeAdjacency } from '@/games/minesweeper/logic/boardGen';
import type { Cell, GameState, PlayerResult } from '@/games/minesweeper/types/game';

/**
 * Pure Minesweeper rules. Every mutation goes through {@link applyAction}, which
 * returns the SAME state reference for an illegal / no-op action so both the
 * Zustand store and the host session can cheaply detect "nothing changed".
 *
 * Ownership and turn order are enforced here, so the same reducer validates a
 * local tap and a networked intent identically.
 */

export type GameAction =
  | { type: 'REVEAL'; index: number; player: number }
  | { type: 'CYCLE_MARK'; index: number; player: number }
  /** Set exactly `mark`, or clear it if the cell already has it (mode buttons). */
  | { type: 'TOGGLE_MARK'; index: number; player: number; mark: 'flag' | 'question' }
  /** Remove any mark from the cell (the "clear" mode button). */
  | { type: 'CLEAR_MARK'; index: number; player: number }
  | { type: 'RESET' };

export const INITIAL_STATE: GameState = {
  size: 0,
  mines: 0,
  difficulty: 'normal',
  turnMode: 'parallel',
  cells: [],
  players: [],
  phase: 'playing',
  livesLeft: 0,
  currentPlayerIndex: 0,
  moveCounts: [],
  firstMoveDone: [],
  revealedSafe: 0,
  safeTarget: 0,
};

const nextMark = (mark: Cell['mark']): Cell['mark'] =>
  mark === 'none' ? 'flag' : mark === 'flag' ? 'question' : 'none';

/**
 * Move the mine off `index` onto another safe cell (first-click safety). Prefers
 * a still-hidden cell so we never bury a mine under an already-revealed square
 * (which can happen mid-game in multiplayer).
 */
function relocateMine(cells: Cell[], index: number, size: number): void {
  const target =
    cells.find((c) => !c.mine && c.state === 'hidden' && c.index !== index) ??
    cells.find((c) => !c.mine && c.index !== index);
  if (!target) return; // board is all mines — nothing we can do
  cells[index] = { ...cells[index], mine: false };
  cells[target.index] = { ...cells[target.index], mine: true };
  recomputeAdjacency(cells, size);
}

/**
 * Reveal `start` and, if it opens onto empty space, flood outward through every
 * connected zero-neighbour cell. Flagged and "?"-marked cells block the flood
 * (the player has claimed them). Returns the number of freshly revealed safe
 * (non-mine) cells.
 */
function floodReveal(cells: Cell[], start: number, size: number): number {
  let opened = 0;
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const c = cells[i];
    if (c.state === 'revealed' || c.mark === 'flag' || c.mark === 'question' || c.mine)
      continue;
    cells[i] = { ...c, state: 'revealed', mark: 'none' };
    opened++;
    if (c.adjacent === 0) {
      for (const nb of neighboursOf(i, size)) stack.push(nb);
    }
  }
  return opened;
}

function advanceTurn(state: GameState): number {
  if (state.turnMode !== 'sequential' || state.players.length < 2) {
    return state.currentPlayerIndex;
  }
  return (state.currentPlayerIndex + 1) % state.players.length;
}

function reveal(state: GameState, index: number, player: number): GameState {
  if (state.phase !== 'playing') return state;
  const cell = state.cells[index];
  if (!cell) return state;
  if (cell.owner !== player) return state; // not your territory
  if (state.turnMode === 'sequential' && player !== state.currentPlayerIndex) {
    return state;
  }
  // Flags and "?" marks both shield a cell from being opened by a tap — you must
  // clear the mark first. This mirrors the flood guard below.
  if (cell.state === 'revealed' || cell.mark === 'flag' || cell.mark === 'question')
    return state;

  const cells = state.cells.map((c) => ({ ...c }));
  const firstMoveDone = [...state.firstMoveDone];

  // First reveal for this player is always safe: shove the mine aside.
  if (!firstMoveDone[player]) {
    firstMoveDone[player] = true;
    if (cells[index].mine) relocateMine(cells, index, state.size);
  }

  const moveCounts = [...state.moveCounts];
  moveCounts[player] += 1;

  const hit = cells[index];
  if (hit.mine) {
    // Stepped on a mine.
    if (state.livesLeft > 0) {
      // Spend a life and carry on; the defused mine stays shown but harmless.
      cells[index] = { ...hit, state: 'revealed', mark: 'none', exploded: true };
      return {
        ...state,
        cells,
        firstMoveDone,
        moveCounts,
        livesLeft: state.livesLeft - 1,
        currentPlayerIndex: advanceTurn(state),
      };
    }
    // No lives left — game over. Uncover every mine.
    cells[index] = { ...hit, state: 'revealed', mark: 'none', exploded: true };
    for (const c of cells) {
      if (c.mine && c.state !== 'revealed') {
        cells[c.index] = { ...c, state: 'revealed' };
      }
    }
    return { ...state, cells, firstMoveDone, moveCounts, phase: 'lost' };
  }

  // Safe reveal — flood any empty region it touches.
  const opened = floodReveal(cells, index, state.size);
  const revealedSafe = state.revealedSafe + opened;
  const won = revealedSafe >= state.safeTarget;
  return {
    ...state,
    cells,
    firstMoveDone,
    moveCounts,
    revealedSafe,
    phase: won ? 'won' : state.phase,
    currentPlayerIndex: won ? state.currentPlayerIndex : advanceTurn(state),
  };
}

function setMark(
  state: GameState,
  index: number,
  player: number,
  mark: Cell['mark'],
): GameState {
  if (state.phase !== 'playing') return state;
  const cell = state.cells[index];
  if (!cell) return state;
  if (cell.owner !== player) return state;
  if (cell.state === 'revealed') return state;
  if (cell.mark === mark) return state; // no change
  const cells = state.cells.slice();
  cells[index] = { ...cell, mark };
  return { ...state, cells };
}

function cycleMark(state: GameState, index: number, player: number): GameState {
  const cell = state.cells[index];
  if (!cell) return state;
  return setMark(state, index, player, nextMark(cell.mark));
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'REVEAL':
      return reveal(state, action.index, action.player);
    case 'CYCLE_MARK':
      return cycleMark(state, action.index, action.player);
    case 'TOGGLE_MARK':
      // Tap again on the same mark clears it; otherwise set it.
      return setMark(
        state,
        action.index,
        action.player,
        state.cells[action.index]?.mark === action.mark ? 'none' : action.mark,
      );
    case 'CLEAR_MARK':
      return setMark(state, action.index, action.player, 'none');
    case 'RESET':
      return INITIAL_STATE;
  }
}

/** Per-player end-of-game summary: reveals made and mines correctly flagged. */
export function computeResults(state: GameState): PlayerResult[] {
  return state.players.map((p, index) => {
    let correctFlags = 0;
    for (const c of state.cells) {
      if (c.owner === index && c.mine && c.mark === 'flag') correctFlags++;
    }
    return {
      index,
      name: p.name,
      moves: state.moveCounts[index] ?? 0,
      correctFlags,
    };
  });
}

/** Count of flags a player still has planted (for the live mine counter). */
export function flagsByPlayer(state: GameState, player: number): number {
  let n = 0;
  for (const c of state.cells) {
    if (c.owner === player && c.mark === 'flag') n++;
  }
  return n;
}
