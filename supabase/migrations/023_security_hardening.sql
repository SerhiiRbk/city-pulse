-- Harden view execution and protect badges with RLS

alter view if exists public.profile_stats
  set (security_invoker = true);

alter view if exists public.conversations_with_details
  set (security_invoker = true);

alter view if exists public.events_with_counts
  set (security_invoker = true);

alter view if exists public.groups_with_counts
  set (security_invoker = true);

alter table public.badges enable row level security;

drop policy if exists "Badges are public" on public.badges;

create policy "Badges are public"
  on public.badges for select
  using (true);
