-- Media attachments for group posts
create table if not exists public.group_post_media (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  type text not null check (type in ('image')),
  url text not null,
  caption text check (char_length(caption) <= 300),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.group_post_media enable row level security;

create policy "Group post media visible to all"
  on public.group_post_media for select using (true);

create policy "Group editors can create post media"
  on public.group_post_media for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.group_posts gp
      join public.group_members gm on gm.group_id = gp.group_id
      where gp.id = group_post_media.post_id
        and gm.user_id = auth.uid()
        and gm.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can delete post media"
  on public.group_post_media for delete
  using (
    exists (
      select 1
      from public.group_posts gp
      join public.group_members gm on gm.group_id = gp.group_id
      where gp.id = group_post_media.post_id
        and gm.user_id = auth.uid()
        and gm.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_post_media_post
  on public.group_post_media(post_id, sort_order);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-post-images',
  'group-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Group post images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'group-post-images');

create policy "Authenticated users can upload group post images"
  on storage.objects for insert
  with check (bucket_id = 'group-post-images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete group post images"
  on storage.objects for delete
  using (bucket_id = 'group-post-images' and auth.role() = 'authenticated');
