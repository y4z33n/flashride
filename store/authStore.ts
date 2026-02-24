import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
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
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ session });
        // Fetch user profile
        await get().fetchProfile(session.user.id);
      }

      // Listen for auth changes
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

      if (error) throw error;
      if (data) {
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
