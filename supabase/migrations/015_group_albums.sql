-- Group photo albums
create table if not exists public.group_albums (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  cover_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.group_albums enable row level security;

create policy "Group albums visible to all"
  on public.group_albums for select using (true);

create policy "Group editors can create albums"
  on public.group_albums for insert
  with check (
    auth.role() = 'authenticated'
    and (
      exists (
        select 1 from public.group_members
        where group_members.group_id = group_albums.group_id
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

create policy "Group editors can update albums"
  on public.group_albums for update
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_albums.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can delete albums"
  on public.group_albums for delete
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_albums.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_albums_group on public.group_albums(group_id);

-- Album items: uploaded images, external image URLs, YouTube videos
create table if not exists public.group_album_items (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.group_albums(id) on delete cascade,
  type text not null check (type in ('image_upload', 'image_url', 'youtube')),
  url text not null,
  caption text check (char_length(caption) <= 300),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.group_album_items enable row level security;

create policy "Album items visible to all"
  on public.group_album_items for select using (true);

create policy "Group editors can add album items"
  on public.group_album_items for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.group_albums a
      join public.group_members m on m.group_id = a.group_id
      where a.id = group_album_items.album_id
        and m.user_id = auth.uid()
        and m.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can update album items"
  on public.group_album_items for update
  using (
    exists (
      select 1 from public.group_albums a
      join public.group_members m on m.group_id = a.group_id
      where a.id = group_album_items.album_id
        and m.user_id = auth.uid()
        and m.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can delete album items"
  on public.group_album_items for delete
  using (
    exists (
      select 1 from public.group_albums a
      join public.group_members m on m.group_id = a.group_id
      where a.id = group_album_items.album_id
        and m.user_id = auth.uid()
        and m.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_album_items_album on public.group_album_items(album_id);

-- Storage bucket for album images (5 MB limit, jpg/png only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-album-images',
  'group-album-images',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "Group album images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'group-album-images');

create policy "Authenticated users can upload group album images"
  on storage.objects for insert
  with check (bucket_id = 'group-album-images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete group album images"
  on storage.objects for delete
  using (bucket_id = 'group-album-images' and auth.role() = 'authenticated');
