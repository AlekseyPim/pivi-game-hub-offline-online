import { BOARD_SIZE, FLEET_COUNT } from '@/games/battleship/constants/board';
import {
  cellsAreFree,
  cellsAt,
  emptyBoard,
  randomBoard,
  ringOf,
  shipAt,
  shipCells,
} from '@/games/battleship/logic/placement';
import type {
  Board,
  GameMode,
  GameState,
  PlayerConfig,
  PlayerResult,
  Ship,
  ShotReport,
} from '@/games/battleship/types/game';

/**
 * All Battleship rules, as pure functions over {@link GameState}. Nothing here
 * knows about React, the network or timers.
 *
 * The same functions drive local play and both sides of an online match:
 *
 *  - {@link fireAt} is run by whoever OWNS the target board (locally: us, for
 *    both boards; online: the defender), and returns the {@link ShotReport} that
 *    the shooter needs.
 *  - {@link applyReport} is run by the SHOOTER against their fogged view of the
 *    enemy sea. Both paths advance the turn the same way, so the two devices
 *    stay in step without a central authority.
 */

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface CreateGameOptions {
  mode: GameMode;
  /** Networked match — the enemy board stays fogged. */
  online: boolean;
  /** Which slot this device plays. Local games are always slot 0. */
  mySlot: number;
  players: PlayerConfig[];
}

/** A fogged enemy sea: no ships known yet, but the fleet size is. */
function fogBoard(size: number): Board {
  return { ...emptyBoard(size, false), shipsLeft: FLEET_COUNT };
}

export const INITIAL_STATE: GameState = {
  phase: 'placement',
  mode: 'classic',
  size: BOARD_SIZE,
  online: false,
  boards: [emptyBoard(), fogBoard(BOARD_SIZE)],
  players: [
    { name: '', bot: false },
    { name: '', bot: true },
  ],
  turn: 0,
  mySlot: 0,
  ready: [false, false],
  winner: null,
  moveUsed: false,
  shots: [0, 0],
  hits: [0, 0],
  sunkCount: [0, 0],
  lastShot: [null, null],
};

/**
 * A fresh match in the placement phase. Local games get a bot fleet arranged
 * straight away; online games keep the opponent fogged until they report in.
 */
export function createGame(opts: CreateGameOptions): GameState {
  const size = BOARD_SIZE;
  const boards: Board[] = [emptyBoard(size), emptyBoard(size)];
  const ready = [false, false];
  const other = 1 - opts.mySlot;

  if (opts.online) {
    boards[other] = fogBoard(size);
  } else {
    // The bot arranges its fleet immediately; the human still has to place.
    boards[other] = randomBoard(size);
    ready[other] = true;
  }

  return {
    ...INITIAL_STATE,
    phase: 'placement',
    mode: opts.mode,
    size,
    online: opts.online,
    mySlot: opts.mySlot,
    boards,
    players: opts.players.map((p) => ({ name: p.name, bot: p.bot })),
    ready,
    turn: 0,
    winner: null,
    moveUsed: false,
    shots: [0, 0],
    hits: [0, 0],
    sunkCount: [0, 0],
    lastShot: [null, null],
  };
}

/** Confirm a slot's arrangement. Only the owner of a board may call this. */
export function setFleet(
  state: GameState,
  slot: number,
  ships: Ship[],
): GameState {
  const boards = [...state.boards];
  boards[slot] = {
    ...boards[slot],
    ships,
    shipsLeft: ships.length,
    known: true,
  };
  const ready = [...state.ready];
  ready[slot] = true;
  return { ...state, boards, ready };
}

/** Both fleets are in place — open fire. `first` is the slot that starts. */
export function startPlaying(state: GameState, first: number): GameState {
  return { ...state, phase: 'playing', turn: first, moveUsed: false };
}

// ---------------------------------------------------------------------------
// Shooting
// ---------------------------------------------------------------------------

/**
 * May this cell be fired at? Only virgin water, in both modes.
 *
 * This holds even with ships sailing about, because a ship may only ever move
 * onto water nobody has shot at (see {@link canMoveShip}). A marker therefore
 * never goes out of date: a miss means "empty then and empty for good", and a
 * hit means a deck was holed there. Nothing is ever worth a second shell.
 *
 * It is also what guarantees a battle ends: a ship still afloat has at least one
 * undamaged deck, and that deck can only be standing on unshot water — so there
 * is always a legal shot that finishes it.
 */
export function canFireAt(board: Board, index: number): boolean {
  if (index < 0 || index >= board.marks.length) return false;
  return board.marks[index] === 'none';
}

/**
 * Resolve one shot on a board we fully own. Returns null when the shot is
 * illegal (a cell that may not be fired at, an unknown board), so callers can
 * ignore it.
 */
export function resolveShot(
  board: Board,
  index: number,
  size: number,
): { board: Board; report: ShotReport } | null {
  if (!board.known) return null;
  if (!canFireAt(board, index)) return null;

  const marks = [...board.marks];
  const ship = shipAt(board.ships, index, size);

  if (!ship) {
    marks[index] = 'miss';
    return {
      board: { ...board, marks },
      report: { index, outcome: 'miss', allSunk: false },
    };
  }

  const cells = shipCells(ship, size);
  const deck = cells.indexOf(index);
  // In movement mode a ship that sails on carries its holed decks with it, so a
  // shot can land on a deck that is already breached. That still counts as a hit
  // (a ship IS there), but it does no fresh damage, so it earns no extra shot.
  const repeat = ship.hits[deck];
  const hits = [...ship.hits];
  hits[deck] = true;
  const sunk = hits.every(Boolean);
  const damaged: Ship = { ...ship, hits, sunk };
  const ships = board.ships.map((s) => (s.id === ship.id ? damaged : s));

  if (!sunk) {
    marks[index] = 'hit';
    return {
      board: { ...board, ships, marks },
      report: { index, outcome: 'hit', repeat, allSunk: false },
    };
  }

  // Sunk: reveal the whole wreck and ring it with misses, as on paper.
  for (const cell of cells) marks[cell] = 'sunk';
  const around = ringOf(cells, size).filter((cell) => marks[cell] === 'none');
  for (const cell of around) marks[cell] = 'miss';
  const shipsLeft = board.shipsLeft - 1;

  return {
    board: { ...board, ships, marks, shipsLeft },
    report: {
      index,
      outcome: 'sunk',
      sunk: { ship: damaged, around },
      allSunk: shipsLeft === 0,
    },
  };
}

/** Fold a report into the SHOOTER's fogged view of the enemy sea. */
export function applyReport(
  board: Board,
  report: ShotReport,
  size: number,
): Board {
  const marks = [...board.marks];
  if (report.outcome === 'miss') {
    marks[report.index] = 'miss';
    return { ...board, marks };
  }
  if (report.outcome === 'hit') {
    marks[report.index] = 'hit';
    return { ...board, marks };
  }

  const wreck = report.sunk;
  if (!wreck) return board;
  for (const cell of shipCells(wreck.ship, size)) marks[cell] = 'sunk';
  for (const cell of wreck.around) {
    if (marks[cell] === 'none') marks[cell] = 'miss';
  }
  const ships = board.known
    ? board.ships
    : [...board.ships.filter((s) => s.id !== wreck.ship.id), wreck.ship];
  return {
    ...board,
    ships,
    marks,
    shipsLeft: Math.max(0, board.shipsLeft - 1),
  };
}

/** Turn bookkeeping shared by both sides after a shot lands. */
function afterShot(
  state: GameState,
  shooter: number,
  report: ShotReport,
  boards: Board[],
): GameState {
  const shots = [...state.shots];
  const hits = [...state.hits];
  const sunkCount = [...state.sunkCount];
  const lastShot = [...state.lastShot];
  const target = 1 - shooter;

  /** A hit that actually holed a fresh deck. */
  const damaging = report.outcome !== 'miss' && !report.repeat;

  shots[shooter] += 1;
  if (damaging) hits[shooter] += 1;
  if (report.outcome === 'sunk') sunkCount[shooter] += 1;
  lastShot[target] = report.index;

  if (report.allSunk) {
    return {
      ...state,
      boards,
      shots,
      hits,
      sunkCount,
      lastShot,
      phase: 'finished',
      winner: shooter,
      moveUsed: false,
    };
  }

  // A damaging hit buys another shot; anything else hands the turn over.
  return {
    ...state,
    boards,
    shots,
    hits,
    sunkCount,
    lastShot,
    turn: damaging ? shooter : target,
    moveUsed: false,
  };
}

/**
 * `shooter` fires at `index` on the opposing board, which THIS device owns.
 * Used for both boards in a local game and for the defender's board online.
 */
export function fireAt(
  state: GameState,
  shooter: number,
  index: number,
): { state: GameState; report: ShotReport } | null {
  if (state.phase !== 'playing' || state.turn !== shooter) return null;
  const target = 1 - shooter;
  const resolved = resolveShot(state.boards[target], index, state.size);
  if (!resolved) return null;

  const boards = [...state.boards];
  boards[target] = resolved.board;
  return { state: afterShot(state, shooter, resolved.report, boards), report: resolved.report };
}

/** The shooter folds the defender's answer into their own fogged view. */
export function applyShotReport(
  state: GameState,
  shooter: number,
  report: ShotReport,
): GameState {
  if (state.phase !== 'playing') return state;
  const target = 1 - shooter;
  const boards = [...state.boards];
  boards[target] = applyReport(boards[target], report, state.size);
  return afterShot(state, shooter, report, boards);
}

// ---------------------------------------------------------------------------
// Movement mode
// ---------------------------------------------------------------------------

export type MoveKind = 'up' | 'down' | 'left' | 'right';

export const MOVE_KINDS: MoveKind[] = ['up', 'down', 'left', 'right'];

/**
 * Where a ship would end up after `kind`, ignoring legality. A ship keeps its
 * heading — it steams one cell in the chosen compass direction, which for a
 * hull lying across its course is simply a sidestep.
 */
export function movedTo(ship: Ship, kind: MoveKind): { row: number; col: number } {
  switch (kind) {
    case 'up':
      return { row: ship.row - 1, col: ship.col };
    case 'down':
      return { row: ship.row + 1, col: ship.col };
    case 'left':
      return { row: ship.row, col: ship.col - 1 };
    case 'right':
      return { row: ship.row, col: ship.col + 1 };
  }
}

/**
 * Can this ship make that move?
 *
 * A ship may steam one cell in any of the four compass directions, keeping its
 * heading, as long as the new berth:
 *  - stays on the board and neither overlaps nor touches another ship, and
 *  - is made up entirely of water NOBODY HAS SHOT AT. Any cell already carrying
 *    a marker — a miss just as much as a hit — is closed for good.
 *
 * That second rule is what keeps the enemy's board honest: a marker they earned
 * stays true, because no ship can ever slip in behind it. It also means the sea
 * silts up as the battle goes on: since the berth includes the cells the ship
 * already covers, a holed ship must leave its hit marker behind, and one hemmed
 * in by markers cannot move at all.
 *
 * Wrecks are stuck for good.
 */
export function canMoveShip(
  board: Board,
  ship: Ship,
  kind: MoveKind,
  size: number,
): boolean {
  if (ship.sunk) return false;
  const next = movedTo(ship, kind);
  const cells = cellsAt(ship.size, next.row, next.col, ship.orientation, size);
  if (!cells) return false;
  if (cells.some((cell) => board.marks[cell] !== 'none')) return false;
  return cellsAreFree(cells, board.ships, size, ship.id);
}

/**
 * Dim the hit markers the fleet has sailed away from: a `hit` whose cell no
 * longer carries a ship becomes `hitStale` (drawn at 0.4 opacity). The change is
 * one-way — no ship may ever re-enter shelled water, so a dimmed marker never
 * lights up again. Sunk wrecks never move, so `sunk` marks are final too.
 */
function refreshStaleMarks(board: Board, size: number): Board {
  const occupied = new Set<number>();
  for (const ship of board.ships) {
    if (ship.sunk) continue;
    for (const cell of shipCells(ship, size)) occupied.add(cell);
  }
  let changed = false;
  const marks = board.marks.map((mark, cell) => {
    if (mark !== 'hit' || occupied.has(cell)) return mark;
    changed = true;
    return 'hitStale' as const;
  });
  return changed ? { ...board, marks } : board;
}

/** Every cell whose hit marker is currently dimmed. */
export function staleIndices(board: Board): number[] {
  const out: number[] = [];
  board.marks.forEach((mark, cell) => {
    if (mark === 'hitStale') out.push(cell);
  });
  return out;
}

/**
 * Move one of `slot`'s own ships one cell, once per turn, before shooting.
 * Returns null when the move isn't allowed. `stale` is the new dimmed-marker set, which an
 * online player broadcasts so the enemy's board dims in step.
 */
export function moveShip(
  state: GameState,
  slot: number,
  shipId: string,
  kind: MoveKind,
): { state: GameState; stale: number[] } | null {
  if (state.mode !== 'moving') return null;
  if (state.phase !== 'playing' || state.turn !== slot || state.moveUsed) return null;

  const board = state.boards[slot];
  if (!board.known) return null;
  const ship = board.ships.find((s) => s.id === shipId);
  if (!ship || !canMoveShip(board, ship, kind, state.size)) return null;

  const next = movedTo(ship, kind);
  const ships = board.ships.map((s) =>
    s.id === shipId ? { ...s, row: next.row, col: next.col } : s,
  );
  const moved = refreshStaleMarks({ ...board, ships }, state.size);
  const boards = [...state.boards];
  boards[slot] = moved;

  return {
    state: { ...state, boards, moveUsed: true },
    stale: staleIndices(moved),
  };
}

/**
 * Online: the enemy moved, and told us which of OUR hit markers are now stale.
 * Everything not in the list is a live hit again.
 */
export function applyStale(
  state: GameState,
  slot: number,
  indices: number[],
): GameState {
  const dim = new Set(indices);
  const board = state.boards[slot];
  const marks = board.marks.map((mark, cell) => {
    if (mark !== 'hit' && mark !== 'hitStale') return mark;
    return dim.has(cell) ? 'hitStale' : 'hit';
  });
  const boards = [...state.boards];
  boards[slot] = { ...board, marks };
  return { ...state, boards };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export function computeResults(state: GameState): PlayerResult[] {
  return state.players.map((player, index) => ({
    index,
    name: player.name,
    shots: state.shots[index] ?? 0,
    hits: state.hits[index] ?? 0,
    sunk: state.sunkCount[index] ?? 0,
  }));
}
