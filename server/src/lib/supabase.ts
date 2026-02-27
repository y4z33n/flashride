import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * USER CLIENT — uses the anon key.
 * When combined with a user JWT (passed via Authorization header), Postgres RLS
 * will enforce row-level security automatically.
 * Safe to use for any operation a normal user is allowed to perform.
 */
export const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * ADMIN CLIENT — uses the service role key.
 * ⚠️  This client BYPASSES all RLS policies.
 * Use ONLY for privileged operations (admin actions, server-side triggers).
 * NEVER expose this client or its key to the mobile app or admin panel frontend.
 */
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Creates a per-request Supabase client that injects a user's JWT so that
 * all queries run under that user's identity and respect RLS.
 */
export function createUserClient(accessToken: string) {
  const client = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
  return client;
}
