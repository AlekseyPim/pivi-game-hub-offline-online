import { COLOR_LABEL, COLOR_ORDER, TOKENS_PER_PLAYER } from '@/games/ludo/constants/board';
import { applyMove, sendToBase } from '@/games/ludo/logic/movement';
import {
  getMovableTokenIds,
  grantsExtraTurn,
  hasPlayerWon,
} from '@/games/ludo/logic/rules';
import type { SavedGame } from '@/games/ludo/logic/persistence';
import type {
  GameState,
  Player,
  PlayerColor,
  PlayerConfig,
  Token,
} from '@/games/ludo/types/game';

/**
 * Pure game reducer — the single source of truth for how the Ludo state evolves.
 *
 * Every transition is an `applyAction(state, action) => state` step that leans on
 * the same `rules.ts` / `movement.ts` used everywhere else. Keeping it pure and
 * serialisable is what makes networked play possible: a local tap and a move that
 * arrives from another device are applied by the exact same code. Notably the
 * die is an *input* to `ROLL_DICE` (not rolled inside), so an authoritative host
 * can decide the roll without changing any of this logic.
 *
 * Illegal actions (wrong phase, non-movable token, …) return the *same* state
 * reference, so callers can cheaply detect and ignore no-ops.
 */

export type GameAction =
  | { type: 'START_GAME'; config: PlayerConfig[] }
  | { type: 'ROLL_DICE'; die: number }
  | { type: 'SELECT_TOKEN'; tokenId: string }
  | { type: 'MOVE_TOKEN'; tokenId: string }
  | { type: 'RESOLVE_CAPTURE' }
  | { type: 'NEXT_TURN' }
  | { type: 'SET_PLAYER_NAME'; color: PlayerColor; name: string }
  | { type: 'RESTART' }
  | { type: 'RESET' }
  | { type: 'LOAD'; saved: SavedGame };

export const INITIAL_STATE: GameState = {
  players: [],
  tokens: [],
  currentPlayerIndex: 0,
  diceValue: null,
  diceRolled: false,
  selectedTokenId: null,
  movableTokenIds: [],
  turnStatus: 'rolling',
  rankings: [],
  moveCount: 0,
  captures: [],
  pendingCaptureIds: [],
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Reconcile a deferred capture: any token still waiting to go home is sent to
 * base now. Called before every new action so the logical state is never stale,
 * even if the player acts before the return animation has played out.
 */
function flushPendingCapture(
  tokens: Token[],
  pendingCaptureIds: string[],
): Token[] {
  if (pendingCaptureIds.length === 0) return tokens;
  return tokens.map((t) =>
    pendingCaptureIds.includes(t.id) ? sendToBase(t) : t,
  );
}

function buildTokens(color: PlayerColor): Token[] {
  return Array.from({ length: TOKENS_PER_PLAYER }, (_, index) => ({
    id: `${color}-${index}`,
    color,
    index,
    status: 'base' as const,
    progress: -1,
  }));
}

/** The next player (after `fromIndex`) who still has tokens left to finish. */
function nextActiveIndex(
  players: Player[],
  tokens: Token[],
  fromIndex: number,
): number {
  for (let step = 1; step <= players.length; step++) {
    const idx = (fromIndex + step) % players.length;
    if (!hasPlayerWon(tokens, players[idx].color)) return idx;
  }
  return fromIndex;
}

function startGame(config: PlayerConfig[]): GameState {
  // Keep configured colours in the canonical board order for clean turn flow.
  const ordered = COLOR_ORDER.filter((color) =>
    config.some((p) => p.color === color),
  );

  const players: Player[] = ordered.map((color) => {
    const c = config.find((p) => p.color === color)!;
    return {
      color,
      type: c.type,
      name: c.name ?? capitalize(color),
    };
  });

  const tokens = players.flatMap((player) => buildTokens(player.color));

  return { ...INITIAL_STATE, players, tokens };
}

function rollDice(state: GameState, die: number): GameState {
  if (state.turnStatus !== 'rolling' || state.diceRolled) {
    return state;
  }

  const tokens = flushPendingCapture(state.tokens, state.pendingCaptureIds);
  const color = state.players[state.currentPlayerIndex].color;
  const movableTokenIds = getMovableTokenIds(tokens, color, die);

  return {
    ...state,
    tokens,
    pendingCaptureIds: [],
    diceValue: die,
    diceRolled: true,
    movableTokenIds,
    selectedTokenId: null,
    turnStatus: 'moving',
  };
}

function selectToken(state: GameState, tokenId: string): GameState {
  if (state.turnStatus !== 'moving') return state;
  if (!state.movableTokenIds.includes(tokenId)) return state;
  return { ...state, selectedTokenId: tokenId };
}

function moveToken(state: GameState, tokenId: string): GameState {
  if (state.turnStatus !== 'moving') return state;
  if (state.diceValue == null) return state;
  if (!state.movableTokenIds.includes(tokenId)) return state;

  const die = state.diceValue;

  // Reconcile any still-pending captures from a previous move first.
  const baseTokens = flushPendingCapture(state.tokens, state.pendingCaptureIds);
  const result = applyMove(baseTokens, tokenId, die);

  const color = state.players[state.currentPlayerIndex].color;

  // Defer the captured tokens' trip home: keep them on their square until the
  // moving token arrives (the UI fires RESOLVE_CAPTURE once the hop finishes).
  let tokens = result.tokens;
  const pendingCaptureIds = result.capturedTokenIds;
  let captures = state.captures;
  if (pendingCaptureIds.length > 0) {
    const stillThere = new Map(
      baseTokens
        .filter((t) => pendingCaptureIds.includes(t.id))
        .map((t) => [t.id, t] as const),
    );
    tokens = result.tokens.map((t) => stillThere.get(t.id) ?? t);
    captures = [
      ...captures,
      ...pendingCaptureIds.map((id) => ({
        by: color,
        victim: stillThere.get(id)!.color,
      })),
    ];
  }

  const moveCount = state.moveCount + 1;

  // Award a place the moment a player gets all four tokens home.
  const justFinished = hasPlayerWon(tokens, color);
  let rankings = state.rankings;
  if (justFinished && !rankings.includes(color)) {
    rankings = [...rankings, color];
  }

  // The game runs until a single player is left still chasing the finish.
  const unfinished = state.players.filter(
    (p) => !hasPlayerWon(tokens, p.color),
  );
  if (unfinished.length <= 1) {
    // Append whoever is left (the last place) so rankings cover everyone.
    const finalRankings = [...rankings];
    for (const p of state.players) {
      if (!finalRankings.includes(p.color)) finalRankings.push(p.color);
    }
    return {
      ...state,
      tokens,
      pendingCaptureIds,
      captures,
      moveCount,
      rankings: finalRankings,
      turnStatus: 'finished',
      diceRolled: false,
      diceValue: null,
      selectedTokenId: null,
      movableTokenIds: [],
    };
  }

  // A finished player never keeps the turn, even on a 6 / capture / finish.
  const extraTurn =
    !justFinished &&
    (grantsExtraTurn(die) ||
      pendingCaptureIds.length > 0 ||
      result.reachedFinish);

  const nextPlayerIndex = extraTurn
    ? state.currentPlayerIndex
    : nextActiveIndex(state.players, tokens, state.currentPlayerIndex);

  return {
    ...state,
    tokens,
    pendingCaptureIds,
    captures,
    moveCount,
    rankings,
    currentPlayerIndex: nextPlayerIndex,
    diceRolled: false,
    diceValue: null,
    selectedTokenId: null,
    movableTokenIds: [],
    turnStatus: 'rolling',
  };
}

function resolveCapture(state: GameState): GameState {
  if (state.pendingCaptureIds.length === 0) return state;
  return {
    ...state,
    tokens: flushPendingCapture(state.tokens, state.pendingCaptureIds),
    pendingCaptureIds: [],
  };
}

function nextTurn(state: GameState): GameState {
  if (state.turnStatus === 'finished') return state;

  const tokens = flushPendingCapture(state.tokens, state.pendingCaptureIds);
  return {
    ...state,
    tokens,
    pendingCaptureIds: [],
    currentPlayerIndex: nextActiveIndex(
      state.players,
      tokens,
      state.currentPlayerIndex,
    ),
    diceRolled: false,
    diceValue: null,
    selectedTokenId: null,
    movableTokenIds: [],
    turnStatus: 'rolling',
  };
}

function setPlayerName(
  state: GameState,
  color: PlayerColor,
  name: string,
): GameState {
  const trimmed = name.trim();
  return {
    ...state,
    players: state.players.map((player) =>
      player.color === color
        ? { ...player, name: trimmed || COLOR_LABEL[color] }
        : player,
    ),
  };
}

function load(saved: SavedGame): GameState {
  // Restore the durable position; start the loaded player's turn fresh.
  const unfinished = saved.players.filter(
    (p) => !hasPlayerWon(saved.tokens, p.color),
  );
  const gameOver = unfinished.length <= 1;
  // Never resume on a player who has already finished.
  let currentPlayerIndex = saved.currentPlayerIndex;
  if (
    !gameOver &&
    hasPlayerWon(saved.tokens, saved.players[currentPlayerIndex]?.color)
  ) {
    currentPlayerIndex = nextActiveIndex(
      saved.players,
      saved.tokens,
      currentPlayerIndex,
    );
  }

  return {
    ...INITIAL_STATE,
    players: saved.players,
    tokens: saved.tokens,
    currentPlayerIndex,
    rankings: saved.rankings ?? [],
    moveCount: saved.moveCount ?? 0,
    captures: saved.captures ?? [],
    turnStatus: gameOver ? 'finished' : 'rolling',
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(action.config);
    case 'ROLL_DICE':
      return rollDice(state, action.die);
    case 'SELECT_TOKEN':
      return selectToken(state, action.tokenId);
    case 'MOVE_TOKEN':
      return moveToken(state, action.tokenId);
    case 'RESOLVE_CAPTURE':
      return resolveCapture(state);
    case 'NEXT_TURN':
      return nextTurn(state);
    case 'SET_PLAYER_NAME':
      return setPlayerName(state, action.color, action.name);
    case 'RESTART':
      return restart(state);
    case 'RESET':
      return { ...INITIAL_STATE };
    case 'LOAD':
      return load(action.saved);
  }
}

function restart(state: GameState): GameState {
  const config: PlayerConfig[] = state.players.map((player) => ({
    color: player.color,
    type: player.type,
    name: player.name,
  }));
  return startGame(config);
}
