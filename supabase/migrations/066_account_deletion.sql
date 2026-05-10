-- ============================================================
-- 066: Account Deletion — foundational schema
--
-- Creates the deletion_requests table for tracking account
-- deletion lifecycle, adds deleted_at to profiles for soft-delete
-- visibility filtering, updates RLS policies, and inserts the
-- sentinel "Deleted User" profile row for content anonymization.
-- ============================================================

-- ============================================================
-- 1. DELETION_REQUESTS TABLE
-- ============================================================
CREATE TABLE public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grace_period_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'partially_completed')),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  reminder_failed BOOLEAN NOT NULL DEFAULT false,
  had_pending_reports BOOLEAN NOT NULL DEFAULT false,
  transferred_event_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active (pending) deletion request per user
CREATE UNIQUE INDEX idx_deletion_requests_active
  ON public.deletion_requests(user_id)
  WHERE status = 'pending';

-- Efficient lookup for the hard-delete cron job
CREATE INDEX idx_deletion_requests_expiry
  ON public.deletion_requests(grace_period_ends_at)
  WHERE status = 'pending';

-- ============================================================
-- 2. RLS ON DELETION_REQUESTS
-- ============================================================
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deletion requests (via server action)
CREATE POLICY "Users can insert own deletion requests"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own deletion requests (cancel/reactivate)
CREATE POLICY "Users can update own deletion requests"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins/staff can view all deletion requests
CREATE POLICY "Staff can view all deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (public.is_site_staff(auth.uid()));

-- Service role has full access (for Edge Functions / cron)
CREATE POLICY "Service role full access to deletion requests"
  ON public.deletion_requests FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 3. ADD deleted_at TO PROFILES
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- 4. UPDATE RLS POLICY ON PROFILES
-- ============================================================
-- Drop the original public profiles policy and recreate with
-- deleted_at and is_blocked exclusions
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_private = false AND deleted_at IS NULL AND is_blocked = false);

-- ============================================================
-- 5. SENTINEL PROFILE ROW (Anonymized User)
-- ============================================================
-- Well-known UUID for the anonymized user sentinel.
-- All anonymized content will reference this profile.
-- We must insert into auth.users first (FK constraint on profiles.id).
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  is_sso_user
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'deleted@system.internal',
  '',
  now(),
  now(),
  now(),
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Deleted User',
  'deleted@system.internal',
  'system'
) ON CONFLICT (id) DO NOTHING;
