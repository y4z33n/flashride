import { supabaseAdmin } from '../lib/supabase';
import { createUserClient } from '../lib/supabase';
import type { Message } from '../types';

const PAGE_SIZE = 40;

export const messageService = {

  /**
   * Get messages for a ride — paginated, oldest-first for display.
   * Uses user client so RLS enforces participant-only access.
   */
  async getForRide(
    rideId: string,
    accessToken: string,
    page = 0
  ): Promise<{ data: Message[]; count: number; hasMore: boolean }> {
    const client = createUserClient(accessToken);
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error, count } = await client
      .from('messages')
      .select('*, sender:profiles!sender_id(id, full_name, avatar_url)', { count: 'exact' })
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      data: (data ?? []) as Message[],
      count: count ?? 0,
      hasMore: (count ?? 0) > to + 1,
    };
  },

  /**
   * Send a message — validates the sender is a participant via RLS.
   * Uses user client so the RLS insert policy fires (only participants can send).
   */
  async send(
    rideId: string,
    senderId: string,
    body: string,
    accessToken: string
  ): Promise<Message> {
    const client = createUserClient(accessToken);

    const { data, error } = await client
      .from('messages')
      .insert({ ride_id: rideId, sender_id: senderId, body: body.trim() })
      .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
      .single();

    if (error) {
      // RLS violation → the user is not a participant
      if (error.code === '42501' || error.message?.includes('policy')) {
        throw Object.assign(new Error('You are not a participant of this ride.'), {
          statusCode: 403,
          code: 'NOT_PARTICIPANT',
        });
      }
      throw error;
    }

    return data as Message;
  },
};
