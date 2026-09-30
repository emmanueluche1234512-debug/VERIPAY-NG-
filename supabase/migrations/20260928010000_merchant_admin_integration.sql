-- ==============================================================================
-- VERIPAY NG — MERCHANT ADMIN INTEGRATION & SCOPED CREDENTIALS SCHEMA
-- ==============================================================================
-- Migration: 20260928010000_merchant_admin_integration.sql
-- Description: Supports the Merchant Admin Integration architecture:
--   1. Project-scoped API Keys with granular permission scopes & secure hashing
--   2. Project-scoped Bank Alert Gmail Connections (safe status & server encrypted tokens)
--   3. Cryptographically bound OAuth states for tenant-isolated Google OAuth flow
-- Idempotent, dependency-ordered, and safe for production execution.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. API KEYS TABLE (Project-Scoped Hashed Integration Credentials)
-- ==============================================================================
-- SECURITY INVARIANT:
-- Secret keys are generated once on creation and shown ONLY once to the developer.
-- The database stores strictly a cryptographic hash (SHA-256) of the secret token.
-- Every key is strictly bound to a single project_id and carries granular scopes.
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- e.g., 'vpy_live_a1b2' or 'vpy_test_c3d4' for identification
  key_hash TEXT NOT NULL,   -- SHA-256 digest of the raw secret token
  scopes TEXT[] NOT NULL DEFAULT ARRAY['bank_accounts:read', 'bank_accounts:write']::text[],
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON public.api_keys(key_prefix, environment);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized project users can view API keys" ON public.api_keys;
CREATE POLICY "Authorized project users can view API keys"
  ON public.api_keys
  FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Project owners can insert API keys" ON public.api_keys;
CREATE POLICY "Project owners can insert API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can update or revoke API keys" ON public.api_keys;
CREATE POLICY "Project owners can update or revoke API keys"
  ON public.api_keys
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

DROP POLICY IF EXISTS "Project owners can delete API keys" ON public.api_keys;
CREATE POLICY "Project owners can delete API keys"
  ON public.api_keys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- 3. GMAIL CONNECTIONS TABLE (Project-Scoped Bank Alert Mailbox)
-- ==============================================================================
-- SECURITY INVARIANT:
-- 1. Strictly 1-to-1 relationship per project (one receiving bank-alert Gmail per store).
-- 2. Sensitive refresh tokens are stored encrypted and NEVER returned to browser clients.
-- 3. Public SELECT queries return only safe metadata: email, status, connected_at, last_successful_sync.
-- 4. Ordinary browser clients cannot insert or update encrypted credentials directly.
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'not_connected', 'expired', 'reauth_required', 'disconnected')),
  encrypted_refresh_token TEXT, -- Server-side encrypted OAuth refresh token
  encrypted_access_token TEXT,  -- Server-side encrypted ephemeral token
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_successful_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_project_gmail_connection UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_connections_project ON public.gmail_connections(project_id);
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Authorized project members can view the safe Gmail connection status
DROP POLICY IF EXISTS "Authorized project users can view Gmail connection status" ON public.gmail_connections;
CREATE POLICY "Authorized project users can view Gmail connection status"
  ON public.gmail_connections
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- SECURITY INVARIANT:
-- Remove any browser/client INSERT, UPDATE, or DELETE policies on gmail_connections.
-- All OAuth token creation, refresh, reconnection, and disconnection must occur
-- strictly through trusted server-side VERIPAY OAuth logic.
DROP POLICY IF EXISTS "Authorized project users can update Gmail connection" ON public.gmail_connections;
DROP POLICY IF EXISTS "Authorized project users can insert Gmail connection" ON public.gmail_connections;
DROP POLICY IF EXISTS "Authorized project users can delete Gmail connection" ON public.gmail_connections;

-- Restrict column-level SELECT so ordinary authenticated browser clients can never
-- read encrypted_refresh_token, encrypted_access_token, or token_expires_at
REVOKE INSERT, UPDATE, DELETE ON public.gmail_connections FROM anon, authenticated;
REVOKE SELECT (encrypted_refresh_token, encrypted_access_token, token_expires_at) ON public.gmail_connections FROM anon, authenticated;

-- ==============================================================================
-- 4. OAUTH STATES TABLE (Cryptographic State Binding for Google OAuth)
-- ==============================================================================
-- SECURITY INVARIANT:
-- Prevents CSRF and cross-project injection. Every OAuth state token is randomly
-- generated server-side, bound strictly to one project_id, given a 15-minute expiry,
-- and invalidated immediately upon first use in the callback.
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

-- Only authorized project users can initiate an OAuth state for their project
DROP POLICY IF EXISTS "Users can insert oauth state for authorized project" ON public.oauth_states;
CREATE POLICY "Users can insert oauth state for authorized project"
  ON public.oauth_states
  FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can view oauth states for authorized project" ON public.oauth_states;
CREATE POLICY "Users can view oauth states for authorized project"
  ON public.oauth_states
  FOR SELECT
  USING (public.user_has_project_access(project_id));
