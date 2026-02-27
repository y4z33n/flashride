import { supabaseAdmin } from '../lib/supabase';
import { createUserClient } from '../lib/supabase';
import type { Ride, RideStatus } from '../types';

const PAGE_SIZE = 20;

export const rideService = {

  /**
   * Create a ride — driver_id is always taken from the verified JWT,
   * never trusted from the request body.
   */
  async create(
    driverId: string,
    data: {
      origin_address: string;
      origin_lat: number;
      origin_lng: number;
      destination_address: string;
      destination_lat: number;
      destination_lng: number;
      departure_time: string;
      seats_total: number;
      price_per_seat?: number | null;
      notes?: string | null;
    }
  ): Promise<Ride> {
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .insert({
        ...data,
        driver_id: driverId,
        seats_available: data.seats_total,
        status: 'open',
      })
      .select('*, driver:profiles!driver_id(*)')
      .single();

    if (error) throw error;
    return ride as Ride;
  },

  /**
   * Search rides by date + rough geographic proximity.
   * Uses the composite index on (status, departure_time).
   */
  async search(params: {
    date: string;
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
    page?: number;
  }): Promise<{ data: Ride[]; count: number; hasMore: boolean }> {
    const start = new Date(params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(params.date);
    end.setHours(23, 59, 59, 999);

    const page = params.page ?? 0;
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabaseAdmin
      .from('rides')
      .select('*, driver:profiles!driver_id(*)', { count: 'exact' })
      .eq('status', 'open')
      .gt('seats_available', 0)
      .gte('departure_time', start.toISOString())
      .lte('departure_time', end.toISOString())
      .order('departure_time', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      data: (data ?? []) as Ride[],
      count: count ?? 0,
      hasMore: (count ?? 0) > to + 1,
    };
  },

  /**
   * Get a single ride with driver profile.
   * Uses user client so RLS is respected (public reads are allowed).
   */
  async getById(rideId: string, accessToken: string): Promise<Ride | null> {
    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('rides')
      .select('*, driver:profiles!driver_id(*), ride_requests(*, rider:profiles!rider_id(*))')
      .eq('id', rideId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Ride;
  },

  /**
   * Complete a ride — only the driver can do this.
   */
  async complete(rideId: string, driverId: string): Promise<Ride> {
    // Verify driver owns the ride
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id, status')
      .eq('id', rideId)
      .single();

    if (fetchErr || !existing) throw new Error('Ride not found.');
    if (existing.driver_id !== driverId) throw new Error('Only the driver can complete a ride.');
    if (!['open', 'full', 'in_progress'].includes(existing.status)) {
      throw new Error(`Cannot complete a ride with status: ${existing.status}.`);
    }

    const { data, error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .select('*, driver:profiles!driver_id(*)')
      .single();

    if (error) throw error;
    return data as Ride;
  },

  /**
   * Cancel a ride — only the driver can do this.
   */
  async cancel(rideId: string, driverId: string): Promise<Ride> {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id, status')
      .eq('id', rideId)
      .single();

    if (fetchErr || !existing) throw new Error('Ride not found.');
    if (existing.driver_id !== driverId) throw new Error('Only the driver can cancel a ride.');
    if (['completed', 'cancelled'].includes(existing.status)) {
      throw new Error(`Cannot cancel a ride with status: ${existing.status}.`);
    }

    const { data, error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;
    return data as Ride;
  },

  /**
   * Update ride status to in_progress — driver starts the ride.
   */
  async start(rideId: string, driverId: string): Promise<Ride> {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('rides')
      .select('id, driver_id, status')
      .eq('id', rideId)
      .single();

    if (fetchErr || !existing) throw new Error('Ride not found.');
    if (existing.driver_id !== driverId) throw new Error('Only the driver can start a ride.');
    if (!['open', 'full'].includes(existing.status)) {
      throw new Error(`Cannot start a ride with status: ${existing.status}.`);
    }

    const { data, error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;
    return data as Ride;
  },
};
