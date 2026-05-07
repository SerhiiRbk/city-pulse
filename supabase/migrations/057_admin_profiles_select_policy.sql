-- ============================================================
-- 057: Allow admins/moderators to SELECT all profiles
--
-- Why: The admin/users page queries all profiles via the
-- authenticated client (anon key + user session). Existing RLS
-- only exposes public profiles + own profile. Admins need to
-- see ALL profiles (including private ones) to manage users.
-- ============================================================

create policy "Admins and moderators can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'moderator')
    )
  );
