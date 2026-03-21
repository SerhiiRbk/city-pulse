-- ============================================================
-- City-Pulse: System Events additions
-- ============================================================

-- Add role column to profiles for admin access
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin', 'moderator'));

create index if not exists idx_profiles_role on public.profiles(role);

-- Policy: only admins can create system events
create policy "Admins can create system events"
  on public.events for insert
  with check (
    is_system = false
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );
