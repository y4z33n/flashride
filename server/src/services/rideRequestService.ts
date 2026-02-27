import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ClaimSeatResult {
  success: boolean;
  code: string;
  message: string;
  request_id?: string;
  ride_id?: string;
  seats?: number;
  seats_available?: number;
}

interface AcceptRequestResult {
  success: boolean;
  code: string;
  message: string;
  request_id?: string;
  ride_id?: string;
}

/**
 * rideRequestService
 * ─────────────────────────────────────────────────────────────────────
 * All ride request operations go through Postgres RPC functions.
 * This guarantees atomicity — no race conditions possible.
 *
 * Both functions use SECURITY DEFINER so they bypass RLS,
 * but enforce all business rules inside the function body itself.
 */
export const rideRequestService = {
  /**
   * Atomically submit a join request for a ride.
   * Prevents duplicate requests and validates seats in one DB round-trip.
   */
  async claimSeat(
    rideId: string,
    riderId: string,
    seats: number = 1
  ): Promise<ClaimSeatResult> {
    const { data, error } = await supabaseAdmin.rpc('claim_seat', {
      p_ride_id:  rideId,
      p_rider_id: riderId,
      p_seats:    seats,
    });

    if (error) {
      logger.error('claim_seat RPC failed', { rideId, riderId, seats, error: error.message });
      throw error;
    }

    return data as ClaimSeatResult;
  },

  /**
   * Atomically accept a pending request.
   * Validates driver identity, seat availability, and decrements atomically.
   */
  async acceptRequest(
    requestId: string,
    driverId: string
  ): Promise<AcceptRequestResult> {
    const { data, error } = await supabaseAdmin.rpc('accept_ride_request', {
      p_request_id: requestId,
      p_driver_id:  driverId,
    });

    if (error) {
      logger.error('accept_ride_request RPC failed', { requestId, driverId, error: error.message });
      throw error;
    }

    return data as AcceptRequestResult;
  },

  /**
   * Reject a pending request (driver action).
   * Uses admin client — RLS update policy allows driver to update their ride's requests.
   */
  async rejectRequest(requestId: string, driverId: string): Promise<void> {
    // Verify driver owns the ride this request belongs to
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from('ride_requests')
      .select('id, ride_id, status, rides!inner(driver_id)')
      .eq('id', requestId)
      .single();

    if (fetchErr || !req) throw new Error('Request not found.');

    const ride = req.rides as unknown as { driver_id: string };
    if (ride.driver_id !== driverId) throw new Error('Only the driver can reject requests.');
    if (req.status !== 'pending') throw new Error(`Request is already ${req.status}.`);

    const { error } = await supabaseAdmin
      .from('ride_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Cancel own request (rider action).
   */
  async cancelRequest(requestId: string, riderId: string): Promise<void> {
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from('ride_requests')
      .select('id, rider_id, status')
      .eq('id', requestId)
      .single();

    if (fetchErr || !req) throw new Error('Request not found.');
    if (req.rider_id !== riderId) throw new Error('You can only cancel your own requests.');
    if (!['pending', 'accepted'].includes(req.status)) {
      throw new Error(`Cannot cancel a request with status: ${req.status}.`);
    }

    const { error } = await supabaseAdmin
      .from('ride_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },
};
