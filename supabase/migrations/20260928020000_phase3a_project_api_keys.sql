-- ==============================================================================
-- VERIPAY NG — PHASE 3A FINAL INCREMENTAL MIGRATION
-- ==============================================================================
-- Migration: 20260928020000_phase3a_project_api_keys.sql
-- Description: Complete Phase 3A incremental migration for:
--   1. Project-scoped integration credentials (public.project_api_keys)
--   2. Hardened Gmail connection table & RLS (public.gmail_connections & public.oauth_states)
--   3. Server-write-only hashed checkout sessions (public.checkout_sessions) &
--      incremental order transfer-notification timestamp (public.orders)
--
-- SECURITY INVARIANTS:
-- 1. Does NOT recreate or alter Phase 2 core tables or weaken existing RLS.
-- 2. Raw API secrets are NEVER stored in plaintext; only SHA-256 hashes (secret_hash)
--    and display-safe prefixes (key_prefix) are persisted.
-- 3. Ordinary browser/Supabase sessions CANNOT INSERT, UPDATE, or DELETE records in
--    public.gmail_connections, nor can they read encrypted OAuth token columns.
-- 4. Raw checkout tokens (chk_live_...) are NEVER stored in public.orders,
--    public.checkout_sessions, or any database table. Only SHA-256(raw checkout token)
--    is persisted as token_hash in public.checkout_sessions.
-- 5. Ordinary browser/Supabase sessions (anon, authenticated) CANNOT INSERT, UPDATE,
--    or DELETE rows in public.checkout_sessions, nor can they SELECT token_hash.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROJECT API KEYS TABLE (Project-Scoped Hashed Integration Credentials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,      -- Display-safe prefix: e.g. vpay_live_e89a...7C1B
  secret_hash TEXT NOT NULL,     -- Cryptographic SHA-256 hash of the complete secret
  scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'project:read',
    'bank_accounts:read',
    'bank_accounts:write',
    'gmail_connection:read',
    'gmail_connection:manage',
    'orders:read',
    'orders:create',
    'transactions:read'
  ]::text[],
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for credential lookup during server-side API authentication
CREATE INDEX IF NOT EXISTS idx_project_api_keys_lookup
  ON public.project_api_keys (secret_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_api_keys_project
  ON public.project_api_keys (project_id, environment);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_prefix
  ON public.project_api_keys (key_prefix);

ALTER TABLE public.project_api_keys ENABLE ROW LEVEL SECURITY;

-- Developers can view API key metadata (never secret_hash in UI queries) for authorized projects
DROP POLICY IF EXISTS "Authorized project users can view project API keys" ON public.project_api_keys;
CREATE POLICY "Authorized project users can view project API keys"
  ON public.project_api_keys
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- Project owners can generate new API keys for their projects
DROP POLICY IF EXISTS "Project owners can insert project API keys" ON public.project_api_keys;
CREATE POLICY "Project owners can insert project API keys"
  ON public.project_api_keys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Project owners can revoke or update API keys for their projects
DROP POLICY IF EXISTS "Project owners can update project API keys" ON public.project_api_keys;
CREATE POLICY "Project owners can update project API keys"
  ON public.project_api_keys
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Project owners can delete API keys for their projects
DROP POLICY IF EXISTS "Project owners can delete project API keys" ON public.project_api_keys;
CREATE POLICY "Project owners can delete project API keys"
  ON public.project_api_keys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- 3. GMAIL CONNECTIONS TABLE — HARDENED SERVER-ONLY WRITE ARCHITECTURE
-- ==============================================================================
-- SECURITY CORRECTION:
-- gmail_connections stores server-controlled OAuth fields (encrypted_refresh_token,
-- encrypted_access_token, token_expires_at, connected_at).
-- Ordinary browser/client sessions must NEVER be permitted to INSERT, UPDATE, or
-- DELETE rows in gmail_connections, nor read encrypted token columns.
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('connected', 'not_connected', 'expired', 'reauth_required', 'disconnected')),
  encrypted_refresh_token TEXT,
  encrypted_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_successful_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_project_gmail_connection UNIQUE (project_id)
);

ALTER TABLE public.gmail_connections
  ALTER COLUMN status SET DEFAULT 'not_connected';

CREATE INDEX IF NOT EXISTS idx_gmail_connections_project
  ON public.gmail_connections(project_id);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Remove ALL browser/client INSERT, UPDATE, and DELETE policies from gmail_connections
DROP POLICY IF EXISTS "Authorized project users can insert Gmail connection" ON public.gmail_connections;
DROP POLICY IF EXISTS "Authorized project users can update Gmail connection" ON public.gmail_connections;
DROP POLICY IF EXISTS "Authorized project users can delete Gmail connection" ON public.gmail_connections;

-- Browser/project users may have SELECT access ONLY to their authorized project's record
DROP POLICY IF EXISTS "Authorized project users can view Gmail connection status" ON public.gmail_connections;
CREATE POLICY "Authorized project users can view Gmail connection status"
  ON public.gmail_connections
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- Enforce database-level privilege hardening:
-- 1. Revoke INSERT, UPDATE, DELETE from anon and authenticated roles (trusted service_role only)
-- 2. Revoke SELECT on sensitive OAuth token columns from anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON public.gmail_connections FROM anon, authenticated;
REVOKE SELECT (encrypted_refresh_token, encrypted_access_token, token_expires_at)
  ON public.gmail_connections FROM anon, authenticated;

-- ==============================================================================
-- 4. OAUTH STATES TABLE (Server-Controlled Google OAuth CSRF State Binding)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_lookup ON public.oauth_states(state_token);
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert oauth state for authorized project" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can view oauth states for authorized project" ON public.oauth_states;
CREATE POLICY "Users can view oauth states for authorized project"
  ON public.oauth_states
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- ==============================================================================
-- 5. SAFE SINGLE-ORDER CHECKOUT SESSIONS & INCREMENTAL ORDER COLUMN
-- ==============================================================================
-- Extends public.orders ONLY with customer_marked_transferred_at.
-- Raw checkout tokens are NEVER stored on public.orders or any other table.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_marked_transferred_at TIMESTAMPTZ;

-- Dedicated checkout_sessions table for hashed single-order public checkout tokens.
-- Stores ONLY token_prefix, token_hash (SHA-256 of raw token), order_id, project_id,
-- expires_at, and created_at.
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_checkout_session_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_token_hash
  ON public.checkout_sessions (token_hash);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_project
  ON public.checkout_sessions (project_id);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Remove ALL browser RLS policies allowing INSERT, UPDATE, or DELETE on checkout_sessions
DROP POLICY IF EXISTS "Authorized project users can insert checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Authorized project users can update checkout sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "Authorized project users can delete checkout sessions" ON public.checkout_sessions;

-- Browser project users retain project-scoped SELECT only (excluding token_hash)
DROP POLICY IF EXISTS "Authorized project users can view checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Authorized project users can view checkout sessions"
  ON public.checkout_sessions
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- Enforce server-write-only & column-level privilege hardening on checkout_sessions:
-- 1. Ordinary anon/authenticated clients cannot create, modify, or delete checkout sessions
-- 2. token_hash is never readable by anon/authenticated browser sessions
REVOKE INSERT, UPDATE, DELETE
  ON public.checkout_sessions
  FROM anon, authenticated;

REVOKE SELECT (token_hash)
  ON public.checkout_sessions
  FROM anon, authenticated;
