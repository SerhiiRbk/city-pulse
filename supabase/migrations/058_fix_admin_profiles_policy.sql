-- ============================================================
-- 058: Fix admin profiles SELECT policy (replaces broken 057)
--
-- Why: Migration 057 created a recursive policy — it queried
-- `profiles` inside a policy ON `profiles`, causing infinite
-- recursion. This blocked all SELECT on profiles (and any view
-- that joins profiles, including events_with_counts).
--
-- Fix: Use the existing `is_site_staff()` SECURITY DEFINER
-- function which bypasses RLS when checking the viewer's role,
-- breaking the recursion.
-- ============================================================

-- 1. Drop the broken recursive policy from 057
DROP POLICY IF EXISTS "Admins and moderators can view all profiles" ON public.profiles;

-- 2. Re-create using the SECURITY DEFINER helper (defined in 036)
CREATE POLICY "Admins and moderators can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_site_staff(auth.uid()));
