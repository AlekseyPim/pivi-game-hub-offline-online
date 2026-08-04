import type { GameId } from '@/shared/games/ids';

/**
 * This game's identity inside the hub. It namespaces everything that has to be
 * unique across the four games sharing one app and one backend: the Realtime
 * room key (`room:ludo:1234`), the AsyncStorage keys, the ad cadence.
 *
 * Note the room key changed shape when ludo moved into the hub — the standalone
 * app used a bare `room:{code}` — so a hub client and an old Ludo Pivi install
 * cannot join each other's rooms. That is intended: the two speak the same
 * protocol today, but nothing keeps them in step from here on.
 */
export const GAME_ID: GameId = 'ludo';
