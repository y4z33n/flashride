import { create } from 'zustand';

interface Ride {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  seats_available: number;
  price?: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

interface RideRequest {
  id: string;
  ride_id: string;
  rider_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface RideState {
  rides: Ride[];
  myRides: Ride[];
  currentRide: Ride | null;
  requests: RideRequest[];
  setRides: (rides: Ride[]) => void;
  setMyRides: (rides: Ride[]) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setRequests: (requests: RideRequest[]) => void;
}

export const useRideStore = create<RideState>((set) => ({
  rides: [],
  myRides: [],
  currentRide: null,
  requests: [],
  setRides: (rides) => set({ rides }),
  setMyRides: (rides) => set({ myRides: rides }),
  setCurrentRide: (ride) => set({ currentRide: ride }),
  setRequests: (requests) => set({ requests }),
}));
