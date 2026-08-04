import { create } from 'zustand';

import { chooseShipMove, chooseShot } from '@/games/battleship/logic/bot';
import {
  applyShotReport,
  applyStale,
  createGame,
  fireAt,
  INITIAL_STATE,
  moveShip,
  setFleet,
  startPlaying,
  type CreateGameOptions,
  type MoveKind,
} from '@/games/battleship/logic/gameReducer';
import { shotFeedback } from '@/shared/logic/haptics';
import { useFireworksStore } from '@/shared/store/fireworksStore';
import { useSupporterStore } from '@/shared/store/supporterStore';
import type { GameMode, GameState, Ship, ShotReport } from '@/games/battleship/types/game';

/**
 * Zustand wrapper around the pure reducer. It owns *where* state lives, *when*
 * the bot acts, and nothing else — every rule lives in `gameReducer.ts`.
 *
 * The same store backs local and online play. Locally it owns both boards and
 * resolves every shot itself. Online it owns only our own sea: the enemy board
 * is a fogged view fed by {@link applyEnemyReport}, and incoming shots are
 * answered through {@link resolveIncomingShot} — see `store/onlineStore.ts`.
 */

/** How long the bot "thinks" before moving a ship / firing. */
const BOT_MOVE_DELAY_MS = 550;
const BOT_SHOT_DELAY_MS = 800;

let botTimer: ReturnType<typeof setTimeout> | null = null;

function clearBotTimer(): void {
  if (botTimer) clearTimeout(botTimer);
  botTimer = null;
}

/** Multicolour salute on a win — gold for supporters (a cosmetic perk). */
function celebrate(): void {
  useFireworksStore
    .getState()
    .celebrate({ gold: useSupporterStore.getState().isSupporter });
}

interface GameActions {
  /** Start a fresh local game against the bot (placement phase). */
  startLocal: (mode: GameMode, playerName: string) => void;
  /** Start an online match; `mySlot` is this device's seat. */
  startOnline: (opts: CreateGameOptions) => void;
  /** Confirm our own arrangement and mark this side ready. */
  placeFleet: (ships: Ship[]) => void;
  /** Open fire. `first` is the slot that shoots first. */
  beginPlay: (first: number) => void;

  /** Local play: we fire at the bot, then hand over if we missed. */
  shootLocal: (index: number) => void;
  /** Move one of our own ships (movement mode). Returns the new stale set. */
  moveMyShip: (shipId: string, kind: MoveKind) => number[] | null;

  /** Online, defender side: resolve an incoming shot on our own sea. */
  resolveIncomingShot: (shooter: number, index: number) => ShotReport | null;
  /** Online, shooter side: fold the defender's answer into our fogged view. */
  applyEnemyReport: (report: ShotReport) => void;
  /** Online: the enemy moved — these hit markers of ours are now dimmed. */
  applyEnemyStale: (indices: number[]) => void;
  /** Online: mark the opponent as ready (their fleet is placed). */
  setEnemyReady: (ready: boolean) => void;

  loadSavedGame: (state: GameState) => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => {
  /** Apply a new state, watching for the end of the game. */
  const commit = (next: GameState, previous: GameState): void => {
    set(next);
    if (next.phase === 'finished' && previous.phase !== 'finished') {
      clearBotTimer();
      if (next.winner === next.mySlot) celebrate();
    }
  };

  /** Give the bot the initiative for as long as it keeps hitting. */
  const runBot = (): void => {
    clearBotTimer();
    const state = get();
    if (state.online || state.phase !== 'playing') return;
    if (!state.players[state.turn]?.bot) return;

    const bot = state.turn;
    const own = state.boards[bot];

    // Movement mode: the bot may first sail a (usually wounded) ship away.
    if (state.mode === 'moving' && !state.moveUsed) {
      const plan = chooseShipMove(own, state.size);
      if (plan) {
        botTimer = setTimeout(() => {
          const current = get();
          if (current.phase !== 'playing' || current.turn !== bot) return;
          const moved = moveShip(current, bot, plan.shipId, plan.kind);
          if (moved) set(moved.state);
          botTimer = setTimeout(botShoot, BOT_SHOT_DELAY_MS);
        }, BOT_MOVE_DELAY_MS);
        return;
      }
    }
    botTimer = setTimeout(botShoot, BOT_SHOT_DELAY_MS);
  };

  const botShoot = (): void => {
    botTimer = null;
    const state = get();
    if (state.phase !== 'playing' || !state.players[state.turn]?.bot) return;
    const bot = state.turn;
    const target = 1 - bot;
    const cell = chooseShot(state.boards[target], state.size, state.mode);
    if (cell == null) return;
    const fired = fireAt(state, bot, cell);
    if (!fired) return;
    shotFeedback(fired.report.outcome);
    commit(fired.state, state);
    // A hit earns the bot another shot.
    if (fired.state.phase === 'playing' && fired.state.turn === bot) runBot();
  };

  return {
    ...INITIAL_STATE,

    startLocal: (mode, playerName) => {
      clearBotTimer();
      set(
        createGame({
          mode,
          online: false,
          mySlot: 0,
          players: [
            { name: playerName, bot: false },
            { name: '', bot: true },
          ],
        }),
      );
    },

    startOnline: (opts) => {
      clearBotTimer();
      set(createGame(opts));
    },

    placeFleet: (ships) => {
      const state = get();
      set(setFleet(state, state.mySlot, ships));
    },

    beginPlay: (first) => {
      const state = get();
      set(startPlaying(state, first));
      runBot();
    },

    shootLocal: (index) => {
      const state = get();
      if (state.online || state.turn !== state.mySlot) return;
      const fired = fireAt(state, state.mySlot, index);
      if (!fired) return;
      shotFeedback(fired.report.outcome);
      commit(fired.state, state);
      if (fired.state.phase === 'playing' && fired.state.turn !== state.mySlot) {
        runBot();
      }
    },

    moveMyShip: (shipId, kind) => {
      const state = get();
      const moved = moveShip(state, state.mySlot, shipId, kind);
      if (!moved) return null;
      set(moved.state);
      return moved.stale;
    },

    resolveIncomingShot: (shooter, index) => {
      const state = get();
      const fired = fireAt(state, shooter, index);
      if (!fired) return null;
      shotFeedback(fired.report.outcome);
      commit(fired.state, state);
      return fired.report;
    },

    applyEnemyReport: (report) => {
      const state = get();
      const next = applyShotReport(state, state.mySlot, report);
      shotFeedback(report.outcome);
      commit(next, state);
    },

    applyEnemyStale: (indices) => {
      const state = get();
      set(applyStale(state, 1 - state.mySlot, indices));
    },

    setEnemyReady: (ready) => {
      const state = get();
      const next = [...state.ready];
      next[1 - state.mySlot] = ready;
      set({ ready: next });
    },

    loadSavedGame: (state) => {
      clearBotTimer();
      set(state);
      runBot();
    },

    resetGame: () => {
      clearBotTimer();
      set({ ...INITIAL_STATE });
    },
  };
});
