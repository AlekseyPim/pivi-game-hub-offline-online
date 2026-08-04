import { getSupabase } from '@/shared/net/supabaseClient';
import type { Transport } from '@/shared/net/transport';

/**
 * A {@link Transport} backed by a Supabase Realtime broadcast channel.
 *
 * Both players in a room join `room:{game}:{code}`; every message is one
 * broadcast event fanned out to the other member (`self: false`, mirroring the
 * loopback hub). The room key is namespaced by game id, so a "1234" in sudoku
 * and a "1234" in battleship are different rooms even though every game in the
 * hub shares one Supabase project. Resolves once SUBSCRIBED.
 */

const EVENT = 'm';

export async function createSupabaseTransport<M>(
  gameId: string,
  roomCode: string,
): Promise<Transport<M>> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  const handlers = new Set<(msg: M) => void>();
  const channel = supabase.channel(`room:${gameId}:${roomCode}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: EVENT }, ({ payload }) => {
    const msg = payload as M;
    for (const handler of handlers) handler(msg);
  });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Realtime channel ${status}`));
      }
    });
  });

  return {
    send(msg) {
      void channel.send({ type: 'broadcast', event: EVENT, payload: msg });
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      handlers.clear();
      void supabase.removeChannel(channel);
    },
  };
}
