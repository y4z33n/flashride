/**
 * lib/api.ts — All business operations go through the Node server.
 *
 * The httpClient automatically attaches the Supabase session JWT.
 * Supabase is still used directly for:
 *   - Auth (login, logout, session) — lib/auth.ts
 *   - Realtime subscriptions — screens use supabase.channel() directly
 *   - Profile reads in auth store — lib/auth.ts
 */

import { http, ApiError } from './httpClient';
import { supabase } from './supabase';
import type { Ride, RideRequest, Message, LocationUpdate, Rating, Profile } from './types';

export { ApiError };
export const PAGE_SIZE = 20;

// ── Rides ──────────────────────────────────────────────────────────────

export const rideService = {
  create: async (ride: {
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
  }) => {
    const data = await http.post<Ride>('/rides', ride);
    return { data, error: null };
  },

  search: async (params: {
    date: string;
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    q.set('date', params.date);
    if (params.origin_lat !== undefined) q.set('origin_lat', String(params.origin_lat));
    if (params.origin_lng !== undefined) q.set('origin_lng', String(params.origin_lng));
    if (params.destination_lat !== undefined) q.set('destination_lat', String(params.destination_lat));
    if (params.destination_lng !== undefined) q.set('destination_lng', String(params.destination_lng));
    if (params.page !== undefined) q.set('page', String(params.page));

    const data = await http.get<{ data: Ride[]; count: number; hasMore: boolean }>(
      `/rides/search?${q.toString()}`
    );
    return { data: data.data, error: null, count: data.count, hasMore: data.hasMore };
  },

  getById: async (id: string) => {
    const data = await http.get<Ride>(`/rides/${id}`);
    return { data, error: null };
  },

  // Still reads directly from Supabase (uses RLS user client, no server endpoint needed)
  getMyRides: async (userId: string, page = 0) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('rides')
      .select('*, driver:profiles!driver_id(*)', { count: 'exact' })
      .eq('driver_id', userId)
      .order('departure_time', { ascending: false })
      .range(from, to);
    return { data, error, count, hasMore: (count ?? 0) > to + 1 };
  },

  start: async (rideId: string) => {
    const data = await http.post<Ride>(`/rides/${rideId}/start`);
    return { data, error: null };
  },

  complete: async (rideId: string) => {
    const data = await http.post<Ride>(`/rides/${rideId}/complete`);
    return { data, error: null };
  },

  cancel: async (rideId: string) => {
    const data = await http.post<Ride>(`/rides/${rideId}/cancel`);
    return { data, error: null };
  },
};

// ── Ride Requests ──────────────────────────────────────────────────────

export const requestService = {
  // Atomic seat claim — goes through Node → Postgres RPC
  create: async (rideId: string, seats = 1) => {
    const data = await http.post<{ success: boolean; request_id: string; code: string; message: string }>(
      `/rides/${rideId}/request`,
      { seats }
    );
    return { data, error: null };
  },

  // Still reads directly from Supabase (RLS allows participants to read)
  getForRide: async (rideId: string) => {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*, rider:profiles!rider_id(*)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  getForRider: async (riderId: string) => {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*, ride:rides(*, driver:profiles!driver_id(*))')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Write operations go through Node (atomic RPC + audit)
  accept: async (requestId: string) => {
    const data = await http.post<{ success: boolean; code: string; message: string }>(
      `/requests/${requestId}/accept`
    );
    return { data, error: null };
  },

  reject: async (requestId: string) => {
    const data = await http.post<{ success: boolean; message: string }>(
      `/requests/${requestId}/reject`
    );
    return { data, error: null };
  },

  cancel: async (requestId: string) => {
    const data = await http.post<{ success: boolean; message: string }>(
      `/requests/${requestId}/cancel`
    );
    return { data, error: null };
  },
};

// ── Messages ───────────────────────────────────────────────────────────

export const messageService = {
  getForRide: async (rideId: string, page = 0) => {
    const data = await http.get<{ data: Message[]; count: number; hasMore: boolean }>(
      `/rides/${rideId}/messages?page=${page}`
    );
    return { data: data.data, error: null, count: data.count, hasMore: data.hasMore };
  },

  send: async (rideId: string, body: string) => {
    const data = await http.post<Message>(`/rides/${rideId}/messages`, { body });
    return { data, error: null };
  },
};

// ── Location Updates ───────────────────────────────────────────────────

export const locationService = {
  upsert: async (rideId: string, lat: number, lng: number, heading?: number | null) => {
    const data = await http.post<LocationUpdate>(`/rides/${rideId}/location`, { lat, lng, heading });
    return { data, error: null };
  },

  getLatest: async (rideId: string) => {
    const data = await http.get<LocationUpdate | { location: null }>(`/rides/${rideId}/location`);
    const location = 'location' in data && data.location === null ? null : data as LocationUpdate;
    return { data: location, error: null };
  },
};

// ── Profile ────────────────────────────────────────────────────────────

export const profileService = {
  getMe: async () => {
    const data = await http.get<{ id: string; email: string; profile: Profile | null }>('/me');
    return { data, error: null };
  },

  getById: async (userId: string) => {
    const data = await http.get<Omit<Profile, 'email'>>(`/users/${userId}`);
    return { data, error: null };
  },

  update: async (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'is_driver' | 'vehicle_info'>>) => {
    const data = await http.patch<Profile>('/me', updates);
    return { data, error: null };
  },
};

// ── Ratings ────────────────────────────────────────────────────────────
// Ratings are still read/written directly via Supabase (no server endpoint yet — Step 10)

export const ratingService = {
  submit: async (rating: Pick<Rating, 'ride_id' | 'rater_id' | 'rated_id' | 'score' | 'comment'>) => {
    const { data, error } = await supabase
      .from('ratings')
      .insert(rating)
      .select()
      .single();
    return { data, error };
  },

  getForUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('ratings')
      .select('*, rater:profiles!rater_id(*)')
      .eq('rated_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};

