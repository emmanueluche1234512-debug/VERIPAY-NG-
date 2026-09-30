-- ==============================================================================
-- VERIPAY NG — PHASE 2 CORE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Migration: 20260928000000_phase2_core_schema.sql
-- Description: Core schema for multi-tenant accounts, projects, receiving bank
-- accounts, orders, payment alert schemas, audit logs, and hardened RLS policies.
-- Safe, dependency-ordered, and idempotent execution for fresh or partially-run DBs.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (Linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NULL,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. PROFILES TRIGGER & FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'company',
    'developer' -- Hardcoded default: Users cannot grant themselves admin in metadata
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. PROJECTS TABLE (Multi-Tenant Stores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for projects are defined in Step 8 after project_members exists

-- ==============================================================================
-- 5. PROJECT MEMBERS TABLE (Team / Access Grants)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'developer', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_lookup ON public.project_members(project_id, user_id);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for project_members are defined in Step 8 after helper functions exist

-- ==============================================================================
-- 6. PROJECT MEMBERSHIP TRIGGER & FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_project_member()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created_add_member ON public.projects;
CREATE TRIGGER on_project_created_add_member
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project_member();

-- ==============================================================================
-- 7. ACCESS CONTROL HELPER FUNCTION (Avoids Recursive RLS Policies)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$;

-- ==============================================================================
-- 8. RLS POLICIES FOR PROJECTS AND PROJECT MEMBERS
-- ==============================================================================
-- Both public.projects and public.project_members exist now

-- Projects Policies
DROP POLICY IF EXISTS "Users can view projects they own or belong to" ON public.projects;
CREATE POLICY "Users can view projects they own or belong to"
  ON public.projects
  FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert projects owned by themselves" ON public.projects;
CREATE POLICY "Users can insert projects owned by themselves"
  ON public.projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
CREATE POLICY "Owners can update their projects"
  ON public.projects
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
CREATE POLICY "Owners can delete their projects"
  ON public.projects
  FOR DELETE
  USING (owner_id = auth.uid());

-- Project Members Policies
DROP POLICY IF EXISTS "Users can view members of projects they access" ON public.project_members;
CREATE POLICY "Users can view members of projects they access"
  ON public.project_members
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.user_has_project_access(project_id)
  );

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
CREATE POLICY "Project owners can manage members"
  ON public.project_members
  FOR ALL
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

-- ==============================================================================
-- 9. BANK ACCOUNTS TABLE (Receiving Destination Info ONLY)
-- ==============================================================================
-- NEVER stores passwords, PINs, OTPs, or online banking credentials.
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP')),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_project ON public.bank_accounts(project_id);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank accounts for authorized projects" ON public.bank_accounts;
CREATE POLICY "Users can view bank accounts for authorized projects"
  ON public.bank_accounts
  FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can insert bank accounts for authorized projects" ON public.bank_accounts;
CREATE POLICY "Users can insert bank accounts for authorized projects"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update bank accounts for authorized projects" ON public.bank_accounts;
CREATE POLICY "Users can update bank accounts for authorized projects"
  ON public.bank_accounts
  FOR UPDATE
  USING (public.user_has_project_access(project_id))
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can delete bank accounts for authorized projects" ON public.bank_accounts;
CREATE POLICY "Users can delete bank accounts for authorized projects"
  ON public.bank_accounts
  FOR DELETE
  USING (public.user_has_project_access(project_id));

-- ==============================================================================
-- 10. ORDERS TABLE (Pending & Verified Customer Orders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  merchant_order_reference TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP')),
  expected_payer_name TEXT NOT NULL,
  payer_bank TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'manual_review', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  matched_payment_alert_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_project_merchant_ref UNIQUE (project_id, merchant_order_reference)
);

CREATE INDEX IF NOT EXISTS idx_orders_project_status ON public.orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expiry ON public.orders(status, expires_at);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view orders in authorized projects" ON public.orders;
CREATE POLICY "Users can view orders in authorized projects"
  ON public.orders
  FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can insert orders in authorized projects" ON public.orders;
CREATE POLICY "Users can insert orders in authorized projects"
  ON public.orders
  FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update orders in authorized projects" ON public.orders;
CREATE POLICY "Users can update orders in authorized projects"
  ON public.orders
  FOR UPDATE
  USING (public.user_has_project_access(project_id))
  WITH CHECK (public.user_has_project_access(project_id));

-- ==============================================================================
-- 11. PAYMENT ALERTS TABLE (Ingested Bank Notifications Schema Foundation)
-- ==============================================================================
-- SECURITY INVARIANT:
-- Genuine bank alert records originate strictly from trusted server-side ingestion
-- (Phase 4/5 Gmail API + Phase 6 Gemini structured extraction).
-- Browser clients MUST NOT insert, update, or delete payment alerts.
CREATE TABLE IF NOT EXISTS public.payment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'gmail',
  source_message_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'NGN',
  sender_name TEXT,
  alert_type TEXT NOT NULL DEFAULT 'CREDIT' CHECK (alert_type IN ('CREDIT', 'DEBIT', 'WITHDRAWAL', 'TRANSFER_OUT', 'REVERSAL', 'UNKNOWN')),
  bank_name TEXT,
  transaction_time TIMESTAMPTZ,
  transaction_reference TEXT,
  raw_snippet TEXT,
  extraction_confidence NUMERIC,
  ambiguities JSONB,
  status TEXT NOT NULL DEFAULT 'UNMATCHED' CHECK (status IN ('RECEIVED', 'EXTRACTED', 'VERIFIED', 'MANUAL_REVIEW', 'UNMATCHED', 'IGNORED')),
  matched_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ,
  CONSTRAINT uq_project_source_msg UNIQUE (project_id, source, source_message_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_alerts_project ON public.payment_alerts(project_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_created ON public.payment_alerts(project_id, created_at DESC);
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

-- Clean up any prior broad browser-facing write policies
DROP POLICY IF EXISTS "Authorized project users can insert payment alerts" ON public.payment_alerts;
DROP POLICY IF EXISTS "Authorized project users can update payment alerts" ON public.payment_alerts;

-- Authenticated project users can strictly SELECT alerts belonging to their authorized projects
DROP POLICY IF EXISTS "Users can view payment alerts for authorized projects" ON public.payment_alerts;
CREATE POLICY "Users can view payment alerts for authorized projects"
  ON public.payment_alerts
  FOR SELECT
  USING (public.user_has_project_access(project_id));

-- Intentionally NO client-side INSERT, UPDATE, or DELETE policies for payment_alerts

-- ==============================================================================
-- 12. MANUAL REVIEWS TABLE (Flagged Transactions Schema Foundation)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_alert_id UUID NOT NULL REFERENCES public.payment_alerts(id) ON DELETE CASCADE,
  candidate_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'left_unmatched')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_manual_reviews_project_status ON public.manual_reviews(project_id, status);
ALTER TABLE public.manual_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view manual reviews for authorized projects" ON public.manual_reviews;
CREATE POLICY "Users can view manual reviews for authorized projects"
  ON public.manual_reviews
  FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update manual reviews for authorized projects" ON public.manual_reviews;
CREATE POLICY "Users can update manual reviews for authorized projects"
  ON public.manual_reviews
  FOR UPDATE
  USING (public.user_has_project_access(project_id))
  WITH CHECK (public.user_has_project_access(project_id));

-- ==============================================================================
-- 13. NOTIFICATIONS TABLE (Per-User Real-time System Feed)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only view their own notifications" ON public.notifications;
CREATE POLICY "Users can only view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can only update their own notifications" ON public.notifications;
CREATE POLICY "Users can only update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clean up any prior broad browser-facing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications for authorized recipients" ON public.notifications;

-- Intentionally NO client-side INSERT policy. Trusted backend logic creates notifications.

-- ==============================================================================
-- 14. AUDIT LOGS TABLE (Append-Only Immutable Event Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON public.audit_logs(project_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs for authorized projects" ON public.audit_logs;
CREATE POLICY "Users can view audit logs for authorized projects"
  ON public.audit_logs
  FOR SELECT
  USING (
    project_id IS NULL 
    OR public.user_has_project_access(project_id)
  );

-- Clean up any prior broad browser-facing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert audit log entries" ON public.audit_logs;

-- Intentionally NO client-side INSERT, UPDATE, or DELETE policies for audit_logs.
-- Security-sensitive audit events will be generated by trusted server-side / database functions.
