import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

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

interface AuthState {
  session: SupabaseSession | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: SupabaseSession | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ session });
        await get().fetchProfile(session.user.id);
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
        if (session) {
          get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        set({ profile: data });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
