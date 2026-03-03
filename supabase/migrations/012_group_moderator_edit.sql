-- ============================================================
-- GROUPS: allow moderators and site admins to update
-- ============================================================
drop policy if exists "Creator can update group" on public.groups;
drop policy if exists "Creator or moderator can update group" on public.groups;

create policy "Creator or moderator can update group"
  on public.groups for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members
      where group_members.group_id = id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

-- ============================================================
-- EVENT MODERATORS: allow existing moderators & site admins to manage
-- ============================================================
drop policy if exists "Organizers can add moderators" on public.event_moderators;
drop policy if exists "Organizers can remove moderators" on public.event_moderators;
drop policy if exists "Editors can add event moderators" on public.event_moderators;
drop policy if exists "Editors can remove event moderators" on public.event_moderators;

create policy "Editors can add event moderators"
  on public.event_moderators for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_id and organizer_id = auth.uid()
    )
    or exists (
      select 1 from public.event_moderators em
      where em.event_id = event_moderators.event_id
        and em.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Editors can remove event moderators"
  on public.event_moderators for delete
  using (
    exists (
      select 1 from public.events
      where id = event_id and organizer_id = auth.uid()
    )
    or exists (
      select 1 from public.event_moderators em
      where em.event_id = event_moderators.event_id
        and em.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

-- ============================================================
-- GROUP MEMBERS: allow group admins/moderators to update member roles
-- ============================================================
drop policy if exists "Members can manage own membership" on public.group_members;
drop policy if exists "Members and moderators can manage membership" on public.group_members;

create policy "Members and moderators can manage membership"
  on public.group_members for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );
