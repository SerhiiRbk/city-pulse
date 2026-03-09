-- Group posts and event recaps
create table if not exists public.group_posts (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  type text not null check (type in ('update', 'announcement', 'event_recap')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 4000),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_posts_event_recap_requires_event
    check (type <> 'event_recap' or event_id is not null)
);

alter table public.group_posts enable row level security;

create policy "Group posts visible to all"
  on public.group_posts for select using (true);

create policy "Group editors can create posts"
  on public.group_posts for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = author_id
    and (
      exists (
        select 1 from public.group_members
        where group_members.group_id = group_posts.group_id
          and group_members.user_id = auth.uid()
          and group_members.role in ('admin', 'moderator')
      )
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'moderator')
      )
    )
  );

create policy "Group editors can update posts"
  on public.group_posts for update
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_posts.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can delete posts"
  on public.group_posts for delete
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_posts.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_posts_group_published
  on public.group_posts(group_id, published_at desc);

create index if not exists idx_group_posts_author
  on public.group_posts(author_id);

create index if not exists idx_group_posts_event
  on public.group_posts(event_id)
  where event_id is not null;

create unique index if not exists idx_group_posts_unique_recap_event
  on public.group_posts(event_id)
  where type = 'event_recap' and event_id is not null;
