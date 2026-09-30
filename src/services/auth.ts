import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  company?: string;
}

export const authService = {
  /**
   * Register a new developer account using Supabase Auth
   */
  async signUp({ email, password, fullName, company }: SignUpData) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company: company || ''
          // Note: Role is intentionally omitted here to prevent client-side privilege escalation.
          // Database trigger defaults to 'developer'.
        },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Authenticate developer with email and password
   */
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current developer session
   */
  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Request password recovery reset link
   */
  async resetPasswordForEmail(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update password for currently authenticated user session
   */
  async updateUserPassword(password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch user profile from public.profiles
   */
  async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[authService] Notice fetching profile:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Update user profile information (name, company)
   */
  async updateProfile(userId: string, updates: { full_name?: string; company?: string }) {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get active session
   */
  async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};
