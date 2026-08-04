import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazily-created Supabase client for online multiplayer.
 *
 * Config comes from `EXPO_PUBLIC_*` env vars (see `.env.example`), inlined into
 * the bundle at build time. If they're missing, {@link getSupabase} returns null
 * and the app hides the online entry points — local play needs no backend.
 *
 * We only use Realtime broadcast on public channels, so no auth session is
 * needed; sessions are disabled to avoid an AsyncStorage dependency.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}
