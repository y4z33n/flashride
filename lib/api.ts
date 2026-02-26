import { supabase } from './supabase';
import type { Ride, RideRequest, Message, LocationUpdate, Rating } from './types';

export const PAGE_SIZE = 20;

// ── Rides ──────────────────────────────────────────────────

export const rideService = {
  create: async (ride: Omit<Ride, 'id' | 'created_at' | 'updated_at' | 'driver'>) => {
    const { data, error } = await supabase
      .from('rides')
      .insert(ride)
      .select('*, driver:profiles!driver_id(*)')
      .single();
    return { data, error };
  },

  search: async (params: {
    origin_lat: number;
    origin_lng: number;
    destination_lat: number;
    destination_lng: number;
    date: string; // ISO date string
    page?: number;
  }) => {
    // Search within ±1 day of the given date, status open
    const start = new Date(params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(params.date);
    end.setHours(23, 59, 59, 999);

    const page = params.page ?? 0;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('rides')
      .select('*, driver:profiles!driver_id(*)', { count: 'exact' })
      .eq('status', 'open')
      .gte('departure_time', start.toISOString())
      .lte('departure_time', end.toISOString())
      .gt('seats_available', 0)
      .order('departure_time', { ascending: true })
      .range(from, to);
    return { data, error, count, hasMore: (count ?? 0) > to + 1 };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('rides')
      .select('*, driver:profiles!driver_id(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

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

  updateStatus: async (rideId: string, status: Ride['status']) => {
    const { data, error } = await supabase
      .from('rides')
      .update({ status })
      .eq('id', rideId)
      .select()
      .single();
    return { data, error };
  },
};

// ── Ride Requests ──────────────────────────────────────────

export const requestService = {
  create: async (request: Pick<RideRequest, 'ride_id' | 'rider_id' | 'seats_requested' | 'message'>) => {
    const { data, error } = await supabase
      .from('ride_requests')
      .insert(request)
      .select('*, rider:profiles!rider_id(*), ride:rides(*)')
      .single();
    return { data, error };
  },

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

  updateStatus: async (requestId: string, status: RideRequest['status']) => {
    const { data, error } = await supabase
      .from('ride_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();
    return { data, error };
  },
};

// ── Messages ───────────────────────────────────────────────

export const messageService = {
  getForRide: async (rideId: string, page = 0) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*)', { count: 'exact' })
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false })  // newest first for pagination
      .range(from, to);
    // Reverse so oldest shows at top in the UI
    return { data: data ? [...data].reverse() : data, error, count, hasMore: (count ?? 0) > to + 1 };
  },

  send: async (rideId: string, senderId: string, body: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({ ride_id: rideId, sender_id: senderId, body })
      .select('*, sender:profiles!sender_id(*)')
      .single();
    return { data, error };
  },
};

// ── Location Updates ───────────────────────────────────────

export const locationService = {
  upsert: async (update: Omit<LocationUpdate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('location_updates')
      .insert(update)
      .select()
      .single();
    return { data, error };
  },

  getLatest: async (rideId: string) => {
    const { data, error } = await supabase
      .from('location_updates')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return { data, error };
  },
};

// ── Ratings ────────────────────────────────────────────────

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
