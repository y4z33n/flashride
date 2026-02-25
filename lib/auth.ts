import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
}

export interface ProfileData {
  full_name: string;
  phone: string;
}

export const authService = {
  signUp: async ({ email, password }: SignUpData) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  signIn: async ({ email, password }: SignUpData) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  createProfile: async (userId: string, email: string, profile: ProfileData) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .select()
      .single();
    return { data, error };
  },

  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  updateProfile: async (userId: string, updates: Partial<ProfileData>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },
};
