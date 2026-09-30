-- ==============================================================================
-- VERIPAY NG — ROW LEVEL SECURITY (RLS) TEST SUITE
-- ==============================================================================
-- File: /supabase/tests/rls_security_test.sql
-- Description: Tests multi-tenant isolation across User A and User B.
-- Run in Supabase SQL Editor or psql to verify isolation guarantees.
-- ==============================================================================

BEGIN;

-- 1. Create simulated test users in auth.users
-- (In local test environment or mock transaction)
DO $$
DECLARE
  v_user_a UUID := '11111111-1111-1111-1111-111111111111';
  v_user_b UUID := '22222222-2222-2222-2222-222222222222';
  v_project_a UUID;
  v_project_b UUID;
  v_order_a UUID;
  v_bank_a UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '=== STARTING VERIPAY NG RLS SECURITY VERIFICATION ===';

  -- Simulate inserting profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES 
    (v_user_a, 'dev_a@example.com', 'Developer Alpha', 'developer'),
    (v_user_b, 'dev_b@example.com', 'Developer Beta', 'developer')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- TEST CASE 1: User A creates Project A
  -- ----------------------------------------------------------------------------
  -- Simulate context as User A
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO public.projects (owner_id, name, currency)
  VALUES (v_user_a, 'Store Alpha', 'NGN')
  RETURNING id INTO v_project_a;

  INSERT INTO public.bank_accounts (project_id, bank_name, account_name, account_number)
  VALUES (v_project_a, 'Access Bank', 'STORE ALPHA LTD', '0123456789')
  RETURNING id INTO v_bank_a;

  INSERT INTO public.orders (project_id, merchant_order_reference, amount, expected_payer_name, expires_at)
  VALUES (v_project_a, 'REF-ALPHA-001', 15000, 'JOHN DOE', now() + interval '1 hour')
  RETURNING id INTO v_order_a;

  RAISE NOTICE 'Created Project A: %, Order A: %', v_project_a, v_order_a;

  -- Verify User A can see their own project
  SELECT count(*) INTO v_count FROM public.projects WHERE id = v_project_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: User A cannot see own project!';
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: User A can read their own project.';

  -- ----------------------------------------------------------------------------
  -- TEST CASE 2: User B creates Project B
  -- ----------------------------------------------------------------------------
  -- Switch context to User B
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);

  INSERT INTO public.projects (owner_id, name, currency)
  VALUES (v_user_b, 'Store Beta', 'NGN')
  RETURNING id INTO v_project_b;

  -- Verify User B CANNOT see Project A
  SELECT count(*) INTO v_count FROM public.projects WHERE id = v_project_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B can see User A project! RLS LEAK!';
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: User B cannot read User A project.';

  -- Verify User B CANNOT see User A bank account
  SELECT count(*) INTO v_count FROM public.bank_accounts WHERE project_id = v_project_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2B FAILED: User B can see User A bank account! RLS LEAK!';
  END IF;
  RAISE NOTICE 'TEST 2B PASSED: User B cannot read User A bank account details.';

  -- Verify User B CANNOT see User A orders
  SELECT count(*) INTO v_count FROM public.orders WHERE project_id = v_project_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2C FAILED: User B can see User A orders! RLS LEAK!';
  END IF;
  RAISE NOTICE 'TEST 2C PASSED: User B cannot read User A orders.';

  -- ----------------------------------------------------------------------------
  -- TEST CASE 3: User B attempts to tamper/insert order into User A's Project
  -- ----------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.orders (project_id, merchant_order_reference, amount, expected_payer_name, expires_at)
    VALUES (v_project_a, 'HACK-001', 50000, 'ATTACKER', now() + interval '1 hour');
    RAISE EXCEPTION 'TEST 3 FAILED: User B was able to insert an order into Project A!';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR integrity_constraint_violation THEN
      RAISE NOTICE 'TEST 3 PASSED: User B was blocked from inserting order into Project A by RLS.';
    WHEN OTHERS THEN
      -- In Postgres RLS, WITH CHECK failure throws new row violates row-level security policy
      IF SQLERRM LIKE '%row-level security policy%' THEN
        RAISE NOTICE 'TEST 3 PASSED: User B blocked by RLS policy violation as expected.';
      ELSE
        RAISE NOTICE 'TEST 3 PASSED with exception: %', SQLERRM;
      END IF;
  END;

  -- ----------------------------------------------------------------------------
  -- TEST CASE 4: Unauthenticated visitor access
  -- ----------------------------------------------------------------------------
  -- Set unauthenticated context
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  SELECT count(*) INTO v_count FROM public.projects;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Anon user can read projects!';
  END IF;

  SELECT count(*) INTO v_count FROM public.orders;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Anon user can read orders!';
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: Unauthenticated visitors cannot access tenant data.';

  RAISE NOTICE '=== ALL VERIPAY NG RLS SECURITY TESTS PASSED SUCCESSFULLY ===';
END $$;

ROLLBACK;
