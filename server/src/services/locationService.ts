import { supabaseAdmin } from '../lib/supabase';
import { createUserClient } from '../lib/supabase';
import type { LocationUpdate } from '../types';

export const locationService = {

  /**
   * Driver pushes their current location.
   * Validates the caller IS the driver of this ride before writing.
   */
  async upsert(
    rideId: string,
    driverId: string,
    lat: number,
    lng: number,
    heading?: number | null
  ): Promise<LocationUpdate> {
    // Verify caller is the driver (service role read, then scoped write)
    const { data: ride, error: rideErr } = await supabaseAdmin
      .from('rides')
      .select('driver_id, status')
      .eq('id', rideId)
      .single();

    if (rideErr || !ride) throw new Error('Ride not found.');
    if (ride.driver_id !== driverId) throw new Error('Only the driver can update location.');
    if (!['open', 'full', 'in_progress'].includes(ride.status)) {
      throw new Error('Cannot update location for a completed or cancelled ride.');
    }

    const { data, error } = await supabaseAdmin
      .from('location_updates')
      .insert({
        ride_id:   rideId,
        driver_id: driverId,
        lat,
        lng,
        heading:    heading ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as LocationUpdate;
  },

  /**
   * Get the latest location for a ride.
   * Uses user client so RLS enforces participant-only reads.
   */
  async getLatest(rideId: string, accessToken: string): Promise<LocationUpdate | null> {
    const client = createUserClient(accessToken);

    const { data, error } = await client
      .from('location_updates')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as LocationUpdate | null;
  },
};
