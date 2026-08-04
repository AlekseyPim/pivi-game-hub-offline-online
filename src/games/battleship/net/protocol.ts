import type { GameMode, ShotReport } from '@/games/battleship/types/game';

/**
 * Wire protocol for online play.
 *
 * The **lobby** is host-authoritative, exactly like ludo-game: one client owns
 * the roster, the room code and the match config, and mirrors them to everyone.
 *
 * The **match** is deliberately NOT host-authoritative. In battleship the whole
 * game is the secret of where your ships are, so no client may ever hold the
 * other's fleet: each player owns their own sea, answers incoming shots itself
 * and publishes only what the opponent is entitled to learn.
 */

export type PlayerId = string;

/** One lobby seat: a slot (0-based, = the player's board index) and its owner. */
export interface Seat {
  slot: number;
  id: PlayerId | null;
  name: string;
}

/** Host-chosen match configuration, mirrored to the guest. */
export interface MatchConfig {
  mode: GameMode;
}

/** The host-owned lobby state. */
export interface LobbySnapshot {
  code: string;
  hostId: PlayerId;
  seats: Seat[];
  phase: 'lobby' | 'match';
  config: MatchConfig;
  /** Slots whose player is currently silent (host-computed). */
  disconnected?: number[];
}

export type NetMessage =
  /** guest → host: "I joined" (with display name) / reconnect ping */
  | { t: 'hello'; from: PlayerId; name?: string }
  /** host → all: the current lobby roster + config */
  | { t: 'lobby'; snapshot: LobbySnapshot }
  /** heartbeat so peers track who is still connected */
  | { t: 'ping'; from: PlayerId }
  /** host → all: leave the lobby; everyone arranges their fleet. `first` is
   * the slot that will open fire once both fleets are ready. */
  | { t: 'begin'; first: number; mode: GameMode }
  /** any → all: my fleet is arranged (the arrangement itself is never sent) */
  | { t: 'ready'; from: PlayerId; slot: number }
  /** shooter → defender: fire at this cell of the defender's sea */
  | { t: 'shot'; from: PlayerId; slot: number; index: number }
  /** defender → shooter: how that shot resolved on my sea */
  | { t: 'result'; from: PlayerId; slot: number; report: ShotReport }
  /** owner → all: my ships manoeuvred; these hit markers of yours went dim */
  | { t: 'stale'; from: PlayerId; slot: number; indices: number[] }
  /** any → all: a fleeting emoji reaction */
  | { t: 'emoji'; from: PlayerId; emoji: string }
  /** host → all: play again — back to placement with fresh fleets */
  | { t: 'rematch'; first: number };
