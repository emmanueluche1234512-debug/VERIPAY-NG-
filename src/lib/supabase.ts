import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

/**
 * Veripay NG — Supabase Client Integration
 * Phase 2 Core Database & Auth
 *
 * SECURITY INVARIANT:
 * - Uses ONLY the anonymous/public publishable key (VITE_SUPABASE_ANON_KEY).
 * - NEVER imports or exposes SUPABASE_SERVICE_ROLE_KEY in frontend browser code.
 * - All table operations are strictly protected by PostgreSQL Row Level Security (RLS).
 */

const viteSupabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;

const viteSupabaseAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    : undefined;

const nodeSupabaseUrl =
  typeof process !== 'undefined' && process.env
    ? process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    : undefined;

const nodeSupabaseAnonKey =
  typeof process !== 'undefined' && process.env
    ? process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    : undefined;

const supabaseUrl = (viteSupabaseUrl || nodeSupabaseUrl || '').trim();
const supabaseAnonKey = (viteSupabaseAnonKey || nodeSupabaseAnonKey || '').trim();

// Validation helper to determine if valid Supabase credentials have been configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key' &&
    supabaseAnonKey !== 'placeholder-anon-key'
);

// Safe fallback URL and Key strictly to prevent createClient from throwing at module import time
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient<Database>(safeUrl, safeKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
    detectSessionInUrl: typeof window !== 'undefined',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
