-- ============================================================
-- City-Pulse: Initial Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. INTERESTS (categories for events & user preferences)
-- ============================================================
create table public.interests (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  translations jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.interests enable row level security;

create policy "Interests are viewable by everyone"
  on public.interests for select
  using (true);

-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  age integer,
  hide_age boolean not null default false,
  city text,
  country text,
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  is_available boolean not null default true,
  is_private boolean not null default false,
  social_links jsonb not null default '{}',
  hide_events boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone can see non-private profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (is_private = false);

-- Users can see their own profile (even if private)
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can insert their own profile (on registration)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- 3. CITIES (cached geocoding data)
-- ============================================================
create table public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null,
  lat double precision not null,
  lng double precision not null,
  translations jsonb not null default '{}',
  unique (name, country)
);

alter table public.cities enable row level security;

create policy "Cities are viewable by everyone"
  on public.cities for select
  using (true);

create policy "Authenticated users can insert cities"
  on public.cities for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- 4. TRIGGER: Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. TRIGGER: Auto-update updated_at on profiles
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 6. STORAGE: Buckets for avatars
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 7. INDEXES
-- ============================================================
create index idx_profiles_city on public.profiles(city);
create index idx_profiles_country on public.profiles(country);
create index idx_profiles_role on public.profiles(role);
create index idx_interests_slug on public.interests(slug);
