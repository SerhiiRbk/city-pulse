-- User photo gallery (up to 5 photos per user)
create table if not exists public.user_photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.user_photos enable row level security;

create policy "User photos visible to all"
  on public.user_photos for select using (true);

create policy "Users can insert own photos"
  on public.user_photos for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update own photos"
  on public.user_photos for update
  using (auth.uid() = user_id);

create policy "Users can delete own photos"
  on public.user_photos for delete
  using (auth.uid() = user_id);

create index if not exists idx_user_photos_user on public.user_photos(user_id, sort_order);

-- Storage bucket for user photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-photos',
  'user-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

create policy "User photos bucket public read"
  on storage.objects for select
  using (bucket_id = 'user-photos');

create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'user-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'user-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
