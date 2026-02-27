import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase';
import { Profile } from '../types';

/**
 * profileService
 * ─────────────────────────────────────────────────────────────────────
 * All profile-related DB operations.
 *
 * Rules:
 *  - Pass a RLS-scoped userClient when the caller is a normal user.
 *  - Use supabaseAdmin only for privileged reads (e.g. admin panel lookups).
 */

export const profileService = {
  /**
   * Get a single profile by user ID.
   * Supply `client` as the per-request RLS client so RLS policies apply.
   * Falls back to admin client if no client provided (e.g. internal use).
   */
  async getById(
    userId: string,
    client: SupabaseClient = supabaseAdmin
  ): Promise<Profile | null> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // row not found
      throw error;
    }
    return data as Profile;
  },

  /**
   * Update a user's own profile.
   * Always use the RLS-scoped userClient — the RLS policy will reject
   * any attempt to update another user's profile at the DB level.
   */
  async updateOwn(
    userId: string,
    updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'is_driver' | 'vehicle_info'>>,
    client: SupabaseClient
  ): Promise<Profile> {
    const { data, error } = await client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },
};
