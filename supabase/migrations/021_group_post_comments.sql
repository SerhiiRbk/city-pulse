-- Comments for group posts and event recaps
create table if not exists public.group_post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

alter table public.group_post_comments enable row level security;

create policy "Group post comments visible to all"
  on public.group_post_comments for select using (true);

create policy "Authenticated users can post group post comments"
  on public.group_post_comments for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can delete own group post comments"
  on public.group_post_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.group_posts gp
      join public.group_members gm on gm.group_id = gp.group_id
      where gp.id = group_post_comments.post_id
        and gm.user_id = auth.uid()
        and gm.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_post_comments_post_created
  on public.group_post_comments(post_id, created_at);
