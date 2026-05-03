-- ============================================================
-- 033: RLS consolidation for groups, group_posts, events
--
-- Goal: replace historically permissive "select using (true)" and
-- "status=published" policies with ones that also respect:
--   * is_blocked on the resource itself
--   * is_blocked on the resource owner (events → organizer, groups → creator)
--   * admin / moderator bypass
--   * owner / author bypass
--
-- Safe defaults: previously-visible non-blocked rows remain visible to
-- everyone (including anon). Blocked rows stop leaking to anon and to
-- non-privileged authenticated users. Admins/moderators keep full access
-- so admin dashboards and revalidation flows continue to work.
-- ============================================================

-- ----------------------------------------------------------------
-- Helper: role check that bypasses RLS on profiles
-- ----------------------------------------------------------------
create or replace function public.is_site_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('admin', 'moderator', 'system')
       from public.profiles
      where id = uid),
    false
  );
$$;

comment on function public.is_site_staff(uuid)
  is 'Returns true if the given user is site-level admin, moderator or system. Security definer so it can be used inside RLS policies without recursion.';

revoke all on function public.is_site_staff(uuid) from public;
grant execute on function public.is_site_staff(uuid) to anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- GROUPS
-- ----------------------------------------------------------------
drop policy if exists "Groups are viewable by everyone" on public.groups;

create policy "Groups visible when not blocked"
  on public.groups for select
  using (
    is_blocked is not true
    or created_by = auth.uid()
    or public.is_site_staff(auth.uid())
  );

-- ----------------------------------------------------------------
-- GROUP POSTS
-- ----------------------------------------------------------------
drop policy if exists "Group posts visible to all" on public.group_posts;

create policy "Group posts visible when group not blocked"
  on public.group_posts for select
  using (
    author_id = auth.uid()
    or public.is_site_staff(auth.uid())
    or exists (
      select 1
      from public.groups g
      where g.id = group_posts.group_id
        and (
          g.is_blocked is not true
          or g.created_by = auth.uid()
        )
    )
  );

-- ----------------------------------------------------------------
-- EVENTS
-- ----------------------------------------------------------------
drop policy if exists "Public published events are viewable by everyone" on public.events;
drop policy if exists "Users can view their own events regardless of status" on public.events;

-- Public/private visibility, organizer override, and admin override, all
-- combined in a single select policy to avoid the previous ordering trap
-- where the "public" policy leaked blocked published events.
create policy "Events select respects privacy and blocking"
  on public.events for select
  using (
    organizer_id = auth.uid()
    or public.is_site_staff(auth.uid())
    or (
      status = 'published'
      and is_private = false
      and is_blocked is not true
    )
  );

-- ----------------------------------------------------------------
-- Indexes helpful for the feed / listing queries
-- ----------------------------------------------------------------
-- Fast "latest posts in a group by type" (used by the feed RPC with a type filter)
create index if not exists idx_group_posts_group_type_published
  on public.group_posts(group_id, type, published_at desc);

-- Fast "latest published events per city" (home + city-events pages)
create index if not exists idx_events_status_blocked_starts
  on public.events(status, is_blocked, starts_at desc)
  where status = 'published' and is_private = false;
