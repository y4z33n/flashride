import { create } from 'zustand';
import type { Ride, RideRequest } from '../lib/types';

interface RideState {
  rides: Ride[];
  myRides: Ride[];
  currentRide: Ride | null;
  incomingRequests: RideRequest[];
  myRequests: RideRequest[];

  setRides: (rides: Ride[]) => void;
  setMyRides: (rides: Ride[]) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setIncomingRequests: (requests: RideRequest[]) => void;
  setMyRequests: (requests: RideRequest[]) => void;
  updateRideInList: (updated: Ride) => void;
  updateRequestInList: (updated: RideRequest) => void;
  reset: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  rides: [],
  myRides: [],
  currentRide: null,
  incomingRequests: [],
  myRequests: [],

  setRides: (rides) => set({ rides }),
  setMyRides: (rides) => set({ myRides: rides }),
  setCurrentRide: (ride) => set({ currentRide: ride }),
  setIncomingRequests: (requests) => set({ incomingRequests: requests }),
  setMyRequests: (requests) => set({ myRequests: requests }),

  updateRideInList: (updated) => {
    set({
      rides: get().rides.map(r => r.id === updated.id ? updated : r),
      myRides: get().myRides.map(r => r.id === updated.id ? updated : r),
      currentRide: get().currentRide?.id === updated.id ? updated : get().currentRide,
    });
  },

  updateRequestInList: (updated) => {
    set({
      incomingRequests: get().incomingRequests.map(r => r.id === updated.id ? updated : r),
      myRequests: get().myRequests.map(r => r.id === updated.id ? updated : r),
    });
  },

  reset: () => set({
    rides: [],
    myRides: [],
    currentRide: null,
    incomingRequests: [],
    myRequests: [],
  }),
}));
