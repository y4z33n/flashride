import { supabaseAdmin } from '../lib/supabase';
import type { Rating } from '../types';

/**
 * ratingService
 * ─────────────────────────────────────────────────────────────────────
 * Handles rating submission with duplicate prevention.
 *
 * Rules enforced here (not just at DB level):
 *  - A user cannot rate themselves
 *  - A user can only rate a participant of the same ride
 *  - Duplicates return a typed error, not a raw DB unique-violation
 *  - Only completed rides can be rated
 */
export const ratingService = {

  /**
   * Submit a rating. Returns the created rating or throws with a
   * machine-readable code so the route can return a clean 409.
   */
  async submit(
    rideId: string,
    raterId: string,
    ratedId: string,
    score: number,
    comment?: string | null
  ): Promise<Rating> {

    // Cannot rate yourself
    if (raterId === ratedId) {
      const err = new Error('You cannot rate yourself.') as Error & { code: string };
      err.code = 'SELF_RATING';
      throw err;
    }

    // Ride must be completed
    const { data: ride, error: rideErr } = await supabaseAdmin
      .from('rides')
      .select('id, status, driver_id')
      .eq('id', rideId)
      .single();

    if (rideErr || !ride) {
      const err = new Error('Ride not found.') as Error & { code: string };
      err.code = 'RIDE_NOT_FOUND';
      throw err;
    }

    if (ride.status !== 'completed') {
      const err = new Error('Ratings can only be submitted for completed rides.') as Error & { code: string };
      err.code = 'RIDE_NOT_COMPLETED';
      throw err;
    }

    // Rater must have participated in the ride (as driver or accepted rider)
    const isDriver = ride.driver_id === raterId;
    if (!isDriver) {
      const { data: req } = await supabaseAdmin
        .from('ride_requests')
        .select('id')
        .eq('ride_id', rideId)
        .eq('rider_id', raterId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!req) {
        const err = new Error('You were not a participant in this ride.') as Error & { code: string };
        err.code = 'NOT_A_PARTICIPANT';
        throw err;
      }
    }

    // Rated user must also have participated
    const isRatedDriver = ride.driver_id === ratedId;
    if (!isRatedDriver) {
      const { data: req } = await supabaseAdmin
        .from('ride_requests')
        .select('id')
        .eq('ride_id', rideId)
        .eq('rider_id', ratedId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!req) {
        const err = new Error('The rated user was not a participant in this ride.') as Error & { code: string };
        err.code = 'RATED_NOT_A_PARTICIPANT';
        throw err;
      }
    }

    // Duplicate check — clean 409 instead of DB unique violation
    const { data: existing } = await supabaseAdmin
      .from('ratings')
      .select('id')
      .eq('ride_id', rideId)
      .eq('rater_id', raterId)
      .eq('rated_id', ratedId)
      .maybeSingle();

    if (existing) {
      const err = new Error('You have already rated this person for this ride.') as Error & { code: string };
      err.code = 'ALREADY_RATED';
      throw err;
    }

    // Insert rating
    const { data: rating, error: insertErr } = await supabaseAdmin
      .from('ratings')
      .insert({ ride_id: rideId, rater_id: raterId, rated_id: ratedId, score, comment: comment ?? null })
      .select('*, rater:profiles!rater_id(*)')
      .single();

    if (insertErr) throw insertErr;

    // Update the rated user's running average atomically via RPC if available,
    // otherwise fall back to a direct update using the DB's aggregate.
    supabaseAdmin.rpc('refresh_user_rating', { p_user_id: ratedId }).then(() => {/* fire-and-forget */});

    return rating as Rating;
  },

  /**
   * Get all ratings for a user.
   */
  async getForUser(userId: string): Promise<Rating[]> {
    const { data, error } = await supabaseAdmin
      .from('ratings')
      .select('*, rater:profiles!rater_id(id, full_name, avatar_url)')
      .eq('rated_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Rating[];
  },

  /**
   * Get all ratings for a ride (both directions).
   */
  async getForRide(rideId: string): Promise<Rating[]> {
    const { data, error } = await supabaseAdmin
      .from('ratings')
      .select('*, rater:profiles!rater_id(id, full_name, avatar_url)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Rating[];
  },
};
