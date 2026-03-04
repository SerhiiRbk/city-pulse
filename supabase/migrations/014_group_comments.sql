-- Group comments
create table if not exists public.group_comments (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 1000),
  parent_id uuid references public.group_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.group_comments enable row level security;

create policy "Group comments visible to all"
  on public.group_comments for select using (true);

create policy "Authenticated users can post group comments"
  on public.group_comments for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update own group comments"
  on public.group_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own group comments"
  on public.group_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members
      where group_members.group_id = group_comments.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_comments_group on public.group_comments(group_id);
create index if not exists idx_group_comments_user on public.group_comments(user_id);
