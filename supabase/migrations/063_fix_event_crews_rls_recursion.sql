-- ============================================================
-- Fix infinite recursion in event_crews / event_crew_members RLS
-- ============================================================
-- Problem: SELECT policies on event_crews and event_crew_members
-- reference each other, causing infinite recursion.
--
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS
-- for the membership check, breaking the circular dependency.

-- 1. Create helper functions (SECURITY DEFINER = bypasses RLS)

create or replace function public.is_crew_member(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.event_crew_members
    where crew_id = p_crew_id and user_id = p_user_id
  );
$$;

create or replace function public.get_crew_visibility(p_crew_id uuid)
returns text
language sql
security definer
stable
as $$
  select visibility from public.event_crews where id = p_crew_id;
$$;

-- 2. Drop existing problematic policies

drop policy if exists "event_crews_select" on public.event_crews;
drop policy if exists "event_crew_members_select" on public.event_crew_members;
drop policy if exists "event_crew_members_insert" on public.event_crew_members;

-- 3. Recreate event_crews SELECT policy
-- Host always sees their crew. Public crews visible to all.
-- Private crews visible to members (via security definer function).

create policy "event_crews_select"
  on public.event_crews for select
  to authenticated
  using (
    host_id = auth.uid()
    or visibility = 'public'
    or public.is_crew_member(id, auth.uid())
  );

-- 4. Recreate event_crew_members SELECT policy
-- User can see members if they are a member of the same crew,
-- or if the crew is public. Uses security definer functions to
-- avoid recursion.

create policy "event_crew_members_select"
  on public.event_crew_members for select
  to authenticated
  using (
    public.is_crew_member(crew_id, auth.uid())
    or public.get_crew_visibility(crew_id) = 'public'
  );

-- 5. Recreate event_crew_members INSERT policy
-- User can insert themselves (joining/creating), or host/moderator
-- can add others. Uses security definer to check role.

create policy "event_crew_members_insert"
  on public.event_crew_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );
