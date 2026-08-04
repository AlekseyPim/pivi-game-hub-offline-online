import type { GameState, PlayerColor, PlayerType } from '@/games/ludo/types/game';

/**
 * Wire protocol for host-authoritative multiplayer.
 *
 * One client is the **host**: it owns the authoritative lobby and {@link GameState},
 * is the only one that runs the reducer, and is the only source of the dice.
 * Everyone else is a **guest** that sends *intents* ("I want to roll / move this
 * token") and renders whatever authoritative snapshot the host broadcasts back.
 *
 * Intents deliberately do NOT carry a die — the host injects an authoritative
 * roll — so a guest can't cheat the dice. Selection and capture-return are purely
 * local view concerns and never travel the wire.
 */

export type PlayerId = string;

export type Intent =
  | { kind: 'roll' }
  | { kind: 'move'; tokenId: string }
  | { kind: 'nextTurn' };

/** One seat in the lobby: a board colour and who (if anyone) occupies it. */
export interface Seat {
  color: PlayerColor;
  /** Occupant's player id, or null for an open/absent seat. */
  id: PlayerId | null;
  name: string;
  type: PlayerType;
}

/** The host-owned lobby state, mirrored to every guest. */
export interface LobbySnapshot {
  code: string;
  hostId: PlayerId;
  seats: Seat[];
  phase: 'lobby' | 'playing';
  /** Colours whose human player is currently disconnected (host-computed). */
  disconnected?: PlayerColor[];
  /** Host's fast mode for this session (no bot waits, quick dice roll). */
  fastMode?: boolean;
}

export type NetMessage =
  /** guest → host: "I joined" (with my display name) / reconnect ping */
  | { t: 'hello'; from: PlayerId; name?: string }
  /** guest → host: "seat me in this colour" (host validates it's free) */
  | { t: 'pick'; from: PlayerId; color: PlayerColor }
  /** host → all: the current lobby roster */
  | { t: 'lobby'; snapshot: LobbySnapshot }
  /** guest → host: a request to act on the sender's turn */
  | { t: 'intent'; from: PlayerId; intent: Intent }
  /** heartbeat so the host tracks who is still connected (and vice versa) */
  | { t: 'ping'; from: PlayerId }
  /** any player → all: a fleeting emoji reaction over the sender's base */
  | { t: 'emoji'; color: PlayerColor; emoji: string }
  /** host → all: the new authoritative game snapshot (monotonic `seq`) */
  | { t: 'state'; seq: number; state: GameState };
