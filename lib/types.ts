// Central TypeScript types for FlashRide database schema

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  is_driver: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export type RideStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  driver_id: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_per_seat?: number;
  notes?: string;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  driver?: Profile;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface RideRequest {
  id: string;
  ride_id: string;
  rider_id: string;
  seats_requested: number;
  message?: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  rider?: Profile;
  ride?: Ride;
}

export interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  // Joined
  sender?: Profile;
}

export interface LocationUpdate {
  id: string;
  ride_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading?: number;
  created_at: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment?: string;
  created_at: string;
  // Joined
  rater?: Profile;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  updated_at: string;
}
