-- ============================================================
-- City-Pulse: Groups Schema
-- ============================================================

-- 1. GROUPS
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  cover_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Groups are viewable by everyone"
  on public.groups for select using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "Creator can update group"
  on public.groups for update
  using (created_by = auth.uid());

create policy "Creator can delete group"
  on public.groups for delete
  using (created_by = auth.uid());

create trigger on_group_updated
  before update on public.groups
  for each row execute function public.handle_updated_at();

-- 2. GROUP MEMBERS
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Group members visible to all"
  on public.group_members for select using (true);

create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

create policy "Admins can manage members"
  on public.group_members for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('admin', 'moderator')
    )
  );

-- 3. GROUP SUBSCRIPTIONS (notifications)
create table public.group_subscriptions (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.group_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can subscribe"
  on public.group_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can unsubscribe"
  on public.group_subscriptions for delete
  using (auth.uid() = user_id);

-- 4. STORAGE: Group covers
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-covers',
  'group-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Group covers are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'group-covers');

create policy "Authenticated users can upload group covers"
  on storage.objects for insert
  with check (bucket_id = 'group-covers' and auth.role() = 'authenticated');

-- 5. ADD group_id FK to events (was nullable)
alter table public.events
  add constraint events_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete set null;

-- 6. VIEW: groups with counts
create or replace view public.groups_with_counts as
select
  g.*,
  coalesce(m.member_count, 0) as member_count,
  coalesce(e.event_count, 0) as event_count,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar
from public.groups g
left join (
  select group_id, count(*) as member_count
  from public.group_members group by group_id
) m on m.group_id = g.id
left join (
  select group_id, count(*) as event_count
  from public.events where status = 'published' group by group_id
) e on e.group_id = g.id
left join public.profiles p on p.id = g.created_by;

-- 7. INDEXES
create index idx_group_members_user on public.group_members(user_id);
create index idx_group_members_group on public.group_members(group_id);
create index idx_group_subscriptions_user on public.group_subscriptions(user_id);
create index idx_groups_created_by on public.groups(created_by);
