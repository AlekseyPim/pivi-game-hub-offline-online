import { CELLS } from '@/games/sudoku/constants/board';
import { generatePuzzle } from '@/games/sudoku/logic/sudoku';
import { soleOwner, splitTerritories } from '@/games/sudoku/logic/territories';
import type {
  Cell,
  Difficulty,
  GameState,
  PlayerConfig,
  PlayerResult,
} from '@/games/sudoku/types/game';

/**
 * Every rule of the game, as pure functions over {@link GameState}. Nothing
 * here knows about React, the network or timers.
 *
 * The same functions drive single player and both sides of an online match.
 * Sudoku has no hidden information — both players stare at the same grid — so
 * online play is host-authoritative: the host runs these functions and
 * broadcasts the result, exactly like the sibling minesweeper.
 */

export interface CreateGameOptions {
  difficulty: Difficulty;
  online: boolean;
  /** Which slot this device plays. Single player: 0. */
  mySlot: number;
  players: PlayerConfig[];
}

function emptyCells(): Cell[] {
  return Array.from({ length: CELLS }, (_, index) => ({
    index,
    value: 0,
    given: false,
    notes: [],
    owner: 0,
  }));
}

export const INITIAL_STATE: GameState = {
  phase: 'playing',
  difficulty: 'easy',
  online: false,
  cells: emptyCells(),
  solution: new Array<number>(CELLS).fill(0),
  players: [{ name: '' }],
  mySlot: 0,
  winner: null,
  mistakes: [0, 0],
  startedAt: 0,
  finishedAt: null,
};

/** A fresh puzzle, ready to play. */
export function createGame(opts: CreateGameOptions): GameState {
  const { puzzle, solution } = generatePuzzle(opts.difficulty);
  const owner = opts.online ? splitTerritories() : soleOwner();

  const cells: Cell[] = Array.from({ length: CELLS }, (_, index) => ({
    index,
    value: puzzle[index],
    given: puzzle[index] !== 0,
    notes: [],
    // A printed digit belongs to nobody: there is nothing to write there.
    owner: owner[index],
  }));

  return {
    ...INITIAL_STATE,
    difficulty: opts.difficulty,
    online: opts.online,
    cells,
    solution,
    players: opts.players.map((p) => ({ name: p.name })),
    mySlot: opts.mySlot,
    phase: 'playing',
    winner: null,
    mistakes: [0, 0],
    startedAt: Date.now(),
    finishedAt: null,
  };
}

/** May `slot` write in this cell? Givens are fixed and territories are strict. */
export function canWrite(state: GameState, slot: number, index: number): boolean {
  if (state.phase !== 'playing') return false;
  const cell = state.cells[index];
  if (!cell || cell.given) return false;
  return cell.owner === slot;
}

/**
 * Empty cells of a player's territory that still hold the right digit —
 * the progress that decides the race.
 */
function ownedProgress(
  state: GameState,
  slot: number,
): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (const cell of state.cells) {
    if (cell.given || cell.owner !== slot) continue;
    total += 1;
    if (cell.value === state.solution[cell.index]) filled += 1;
  }
  return { filled, total };
}

/** True once every cell this player owns holds its solution digit. */
export function hasFinished(state: GameState, slot: number): boolean {
  const { filled, total } = ownedProgress(state, slot);
  return total > 0 && filled === total;
}

/** Write a digit (1..9), or 0 to clear. Returns the same state when illegal. */
export function setValue(
  state: GameState,
  slot: number,
  index: number,
  value: number,
): GameState {
  if (!canWrite(state, slot, index)) return state;
  if (value < 0 || value > 9) return state;
  const cell = state.cells[index];
  if (cell.value === value) return state;

  const cells = [...state.cells];
  // Writing a digit retires the pencil marks that were standing in for it.
  cells[index] = { ...cell, value, notes: [] };

  const mistakes = [...state.mistakes];
  if (value !== 0 && value !== state.solution[index]) {
    // Counted quietly for the summary — nothing on screen gives it away.
    mistakes[slot] = (mistakes[slot] ?? 0) + 1;
  }

  const next: GameState = { ...state, cells, mistakes };
  if (hasFinished(next, slot)) {
    return { ...next, phase: 'finished', winner: slot, finishedAt: Date.now() };
  }
  return next;
}

/** Add or remove one pencil mark. Only on cells that are still empty. */
export function toggleNote(
  state: GameState,
  slot: number,
  index: number,
  digit: number,
): GameState {
  if (!canWrite(state, slot, index)) return state;
  if (digit < 1 || digit > 9) return state;
  const cell = state.cells[index];
  if (cell.value !== 0) return state;

  const notes = cell.notes.includes(digit)
    ? cell.notes.filter((n) => n !== digit)
    : [...cell.notes, digit].sort((a, b) => a - b);

  const cells = [...state.cells];
  cells[index] = { ...cell, notes };
  return { ...state, cells };
}

/** Wipe a cell: its digit and its pencil marks. */
export function clearCell(
  state: GameState,
  slot: number,
  index: number,
): GameState {
  if (!canWrite(state, slot, index)) return state;
  const cell = state.cells[index];
  if (cell.value === 0 && cell.notes.length === 0) return state;
  const cells = [...state.cells];
  cells[index] = { ...cell, value: 0, notes: [] };
  return { ...state, cells };
}

/** How many of each digit are still missing from the grid. */
export function remainingDigits(state: GameState): Record<number, number> {
  const left: Record<number, number> = {};
  for (let d = 1; d <= 9; d++) left[d] = 9;
  for (const cell of state.cells) {
    if (cell.value) left[cell.value] -= 1;
  }
  return left;
}

export function computeResults(state: GameState): PlayerResult[] {
  return state.players.map((player, index) => {
    const { filled, total } = ownedProgress(state, index);
    return {
      index,
      name: player.name,
      filled,
      total,
      mistakes: state.mistakes[index] ?? 0,
    };
  });
}
