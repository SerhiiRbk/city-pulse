-- ============================================================
-- Comment Replies: two-level threading, quoting, moderation
-- ============================================================

-- 1. event_comments: add quoted_text, quoted_author_name, reply_to_id
--    (is_approved and parent_id already exist)
alter table public.event_comments
  add column if not exists quoted_text text,
  add column if not exists quoted_author_name text,
  add column if not exists reply_to_id uuid references public.event_comments(id) on delete set null;

create index if not exists idx_event_comments_parent on public.event_comments(parent_id);

-- 2. group_comments: add is_approved, quoted_text, quoted_author_name, reply_to_id
alter table public.group_comments
  add column if not exists is_approved boolean not null default true,
  add column if not exists quoted_text text,
  add column if not exists quoted_author_name text,
  add column if not exists reply_to_id uuid references public.group_comments(id) on delete set null;

create index if not exists idx_group_comments_parent on public.group_comments(parent_id);

-- 3. group_post_comments: add parent_id, is_approved, quoted_text, quoted_author_name, reply_to_id
alter table public.group_post_comments
  add column if not exists parent_id uuid references public.group_post_comments(id) on delete cascade,
  add column if not exists is_approved boolean not null default true,
  add column if not exists quoted_text text,
  add column if not exists quoted_author_name text,
  add column if not exists reply_to_id uuid references public.group_post_comments(id) on delete set null;

create index if not exists idx_group_post_comments_parent on public.group_post_comments(parent_id);

-- ============================================================
-- RLS policy updates
-- ============================================================

-- event_comments: moderators/admins/organizer can see unapproved replies
drop policy if exists "Approved comments visible to all" on public.event_comments;
create policy "Comments visible with moderation" on public.event_comments for select using (
  is_approved = true
  or user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.events
    where events.id = event_comments.event_id and events.organizer_id = auth.uid()
  )
  or exists (
    select 1 from public.event_moderators
    where event_moderators.event_id = event_comments.event_id
      and event_moderators.user_id = auth.uid()
  )
);

-- event_comments: moderators/admins/organizer can update (approve) any comment
drop policy if exists "Users can update own comments" on public.event_comments;
create policy "Users and moderators can update comments" on public.event_comments for update using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.events
    where events.id = event_comments.event_id and events.organizer_id = auth.uid()
  )
  or exists (
    select 1 from public.event_moderators
    where event_moderators.event_id = event_comments.event_id
      and event_moderators.user_id = auth.uid()
  )
);

-- event_comments: moderators/admins/organizer can delete any comment
drop policy if exists "Users can delete own comments" on public.event_comments;
create policy "Users and moderators can delete comments" on public.event_comments for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.events
    where events.id = event_comments.event_id and events.organizer_id = auth.uid()
  )
  or exists (
    select 1 from public.event_moderators
    where event_moderators.event_id = event_comments.event_id
      and event_moderators.user_id = auth.uid()
  )
);

-- group_comments: visibility with moderation
drop policy if exists "Group comments visible to all" on public.group_comments;
create policy "Group comments visible with moderation" on public.group_comments for select using (
  is_approved = true
  or user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.groups
    where groups.id = group_comments.group_id and groups.created_by = auth.uid()
  )
  or exists (
    select 1 from public.group_members
    where group_members.group_id = group_comments.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('admin', 'moderator')
  )
);

-- group_comments: moderators can update (approve)
drop policy if exists "Users can update own group comments" on public.group_comments;
create policy "Users and moderators can update group comments" on public.group_comments for update using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.groups
    where groups.id = group_comments.group_id and groups.created_by = auth.uid()
  )
  or exists (
    select 1 from public.group_members
    where group_members.group_id = group_comments.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('admin', 'moderator')
  )
);

-- group_comments: moderators can delete
drop policy if exists "Users can delete own group comments" on public.group_comments;
create policy "Users and moderators can delete group comments" on public.group_comments for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1 from public.groups
    where groups.id = group_comments.group_id and groups.created_by = auth.uid()
  )
  or exists (
    select 1 from public.group_members
    where group_members.group_id = group_comments.group_id
      and group_members.user_id = auth.uid()
      and group_members.role in ('admin', 'moderator')
  )
);

-- group_post_comments: visibility with moderation
drop policy if exists "Group post comments visible to all" on public.group_post_comments;
create policy "Group post comments visible with moderation" on public.group_post_comments for select using (
  is_approved = true
  or user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'moderator')
  )
  or exists (
    select 1
    from public.group_posts gp
    join public.groups g on g.id = gp.group_id
    where gp.id = group_post_comments.post_id and g.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.group_posts gp
    join public.group_members gm on gm.group_id = gp.group_id
    where gp.id = group_post_comments.post_id
      and gm.user_id = auth.uid()
      and gm.role in ('admin', 'moderator')
  )
);
