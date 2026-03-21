-- ============================================================
-- City-Pulse: Events Schema
-- Run this after 001 and 002 migrations
-- ============================================================

-- ============================================================
-- 1. EVENTS
-- ============================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  photos text[] not null default '{}',
  category_id uuid references public.interests(id),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  is_online boolean not null default false,
  is_free boolean not null default true,
  price numeric(10, 2),
  currency text default 'EUR',
  max_attendees integer,
  country text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid,
  is_private boolean not null default false,
  private_token text unique,
  is_system boolean not null default false,
  source_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Public events visible to everyone
create policy "Public published events are viewable by everyone"
  on public.events for select
  using (
    (status = 'published' and is_private = false)
    or organizer_id = auth.uid()
  );

-- Private events visible via token (handled in app logic) or by organizer
create policy "Users can view their own events regardless of status"
  on public.events for select
  using (organizer_id = auth.uid());

-- Authenticated users can create events
create policy "Authenticated users can create events"
  on public.events for insert
  with check (auth.role() = 'authenticated' and organizer_id = auth.uid());

-- Organizers can update their events
create policy "Organizers can update own events"
  on public.events for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- Organizers can delete their events
create policy "Organizers can delete own events"
  on public.events for delete
  using (organizer_id = auth.uid());

-- Auto-update updated_at
create trigger on_event_updated
  before update on public.events
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 2. EVENT ATTENDEES
-- ============================================================
create table public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'waitlist', 'cancelled')),
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_attendees enable row level security;

create policy "Event attendees are viewable by everyone"
  on public.event_attendees for select
  using (true);

create policy "Users can manage own attendance"
  on public.event_attendees for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attendance"
  on public.event_attendees for update
  using (auth.uid() = user_id);

create policy "Users can cancel own attendance"
  on public.event_attendees for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. EVENT FAVORITES
-- ============================================================
create table public.event_favorites (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_favorites enable row level security;

create policy "Users can view own favorites"
  on public.event_favorites for select
  using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.event_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on public.event_favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. EVENT MODERATORS
-- ============================================================
create table public.event_moderators (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_moderators enable row level security;

create policy "Moderators visible to all"
  on public.event_moderators for select
  using (true);

create policy "Organizers can add moderators"
  on public.event_moderators for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_id and organizer_id = auth.uid()
    )
  );

create policy "Organizers can remove moderators"
  on public.event_moderators for delete
  using (
    exists (
      select 1 from public.events
      where id = event_id and organizer_id = auth.uid()
    )
  );

-- ============================================================
-- 5. EVENT REVIEWS (post-event)
-- ============================================================
create table public.event_reviews (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text check (char_length(content) <= 1000),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.event_reviews for select
  using (true);

create policy "Attendees can write reviews"
  on public.event_reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.event_attendees
      where event_attendees.event_id = event_reviews.event_id
      and event_attendees.user_id = auth.uid()
      and event_attendees.status = 'going'
    )
  );

create policy "Users can update own reviews"
  on public.event_reviews for update
  using (auth.uid() = user_id);

-- ============================================================
-- 6. EVENT COMMENTS
-- ============================================================
create table public.event_comments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  is_approved boolean not null default false,
  parent_id uuid references public.event_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.event_comments enable row level security;

create policy "Approved comments visible to all"
  on public.event_comments for select
  using (is_approved = true or user_id = auth.uid());

create policy "Authenticated users can post comments"
  on public.event_comments for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update own comments"
  on public.event_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.event_comments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 7. STORAGE: Event photos bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Event photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'event-photos');

create policy "Authenticated users can upload event photos"
  on storage.objects for insert
  with check (
    bucket_id = 'event-photos'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete own event photos"
  on storage.objects for delete
  using (
    bucket_id = 'event-photos'
    and auth.role() = 'authenticated'
  );

-- ============================================================
-- 8. INDEXES
-- ============================================================
create index idx_events_organizer on public.events(organizer_id);
create index idx_events_category on public.events(category_id);
create index idx_events_status on public.events(status);
create index idx_events_starts_at on public.events(starts_at);
create index idx_events_city on public.events(city);
create index idx_events_country on public.events(country);
create index idx_events_is_private on public.events(is_private);
create index idx_events_group on public.events(group_id);
create index idx_event_attendees_user on public.event_attendees(user_id);
create index idx_event_favorites_user on public.event_favorites(user_id);
create index idx_event_comments_event on public.event_comments(event_id);
create index idx_event_reviews_event on public.event_reviews(event_id);

-- ============================================================
-- 9. VIEW: Events with attendee counts
-- ============================================================
create or replace view public.events_with_counts as
select
  e.*,
  coalesce(a.going_count, 0) as going_count,
  coalesce(r.avg_rating, 0) as avg_rating,
  coalesce(r.review_count, 0) as review_count,
  p.display_name as organizer_name,
  p.avatar_url as organizer_avatar,
  i.slug as category_slug,
  i.translations as category_translations
from public.events e
left join (
  select event_id, count(*) as going_count
  from public.event_attendees
  where status = 'going'
  group by event_id
) a on a.event_id = e.id
left join (
  select event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews
  group by event_id
) r on r.event_id = e.id
left join public.profiles p on p.id = e.organizer_id
left join public.interests i on i.id = e.category_id;
