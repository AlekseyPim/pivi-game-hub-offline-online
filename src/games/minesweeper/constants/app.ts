import type { GameId } from '@/shared/games/ids';

/**
 * This game's identity inside the hub. It namespaces everything that has to be
 * unique across the four games sharing one app and one backend: the Realtime
 * room key (`room:minesweeper:1234`), the AsyncStorage keys, the ad cadence.
 */
export const GAME_ID: GameId = 'minesweeper';
