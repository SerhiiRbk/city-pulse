-- ============================================================
-- City-Pulse: Event series (recurring events)
-- ============================================================
-- We model recurrence by *materialising* every occurrence as its
-- own row in `events`, linked back to a parent `event_series` row.
-- Trade-offs:
--   * Pros: every read path (events list, RSVP, comments, photos)
--     keeps working unchanged. Per-occurrence overrides (a venue
--     change for *just this Tuesday*) become a regular UPDATE on
--     the row. RLS on `events` already covers everything.
--   * Cons: long-running series with daily cadence could create
--     thousands of rows. We mitigate by capping series at 52
--     occurrences in app code; that's a year of weekly meet-ups
--     — long enough for any real community, short enough to keep
--     the table healthy.
--
-- The `event_series` row stores the *intent* (frequency, interval,
-- until, count). The materialiser uses it to spawn occurrences and
-- to extend the series later if the organiser bumps `count`.
-- ============================================================

create table if not exists public.event_series (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  -- Cadence vocabulary kept narrow on purpose. If we ever need
  -- "first Wednesday of the month" we'll add a proper rrule
  -- column rather than overloading these strings.
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  -- `interval` is reserved for future flexibility (e.g. "every 3
  -- weeks"); today the cadence string carries the meaning.
  interval integer not null default 1 check (interval > 0),
  count integer check (count is null or count between 1 and 52),
  until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_series enable row level security;

drop policy if exists "Organizers manage own series" on public.event_series;
create policy "Organizers manage own series"
  on public.event_series for all
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

drop policy if exists "Series readable by everyone" on public.event_series;
create policy "Series readable by everyone"
  on public.event_series for select
  using (true);

-- Backfill columns on `events`. Each occurrence carries its
-- ordinal position (`series_position`) so we can render
-- "Yoga in the park (4 of 8)" without joining anything.
alter table public.events
  add column if not exists series_id uuid references public.event_series(id) on delete set null,
  add column if not exists series_position integer;

create index if not exists idx_events_series
  on public.events (series_id, starts_at);

-- Refresh `events_with_counts` to expose series fields. We re-issue
-- the entire view rather than ALTER VIEW because Postgres can't
-- add columns to an existing view.
drop view if exists public.events_with_counts;
create view public.events_with_counts as
select
  e.id,
  e.title,
  e.description,
  e.description_json,
  e.photos,
  e.category_id,
  e.starts_at,
  e.ends_at,
  e.duration_minutes,
  e.is_online,
  e.is_free,
  e.price,
  e.currency,
  e.max_attendees,
  e.country,
  e.city,
  e.address,
  e.lat,
  e.lng,
  e.organizer_id,
  e.group_id,
  e.is_private,
  e.private_token,
  e.is_system,
  e.source_url,
  e.parent_system_event_id,
  e.status,
  e.created_at,
  e.updated_at,
  e.city_id,
  coalesce(a.going_count, 0) as going_count,
  coalesce(w.waitlist_count, 0) as waitlist_count,
  coalesce(i_attn.interested_count, 0) as interested_count,
  coalesce(att.attended_count, 0) as attended_count,
  coalesce(ns.no_show_count, 0) as no_show_count,
  coalesce(r.avg_rating, 0) as avg_rating,
  coalesce(r.review_count, 0) as review_count,
  p.display_name as organizer_name,
  p.avatar_url as organizer_avatar,
  i.slug as category_slug,
  i.translations as category_translations,
  ci.name as city_name,
  ci.translations as city_translations,
  e.languages,
  e.is_blocked,
  coalesce(p.is_blocked, false) as organizer_is_blocked,
  e.search_tsv,
  e.safety_tags,
  e.series_id,
  e.series_position
from public.events e
left join (
  select event_id, count(*) as going_count
  from public.event_attendees
  where status = 'going'
  group by event_id
) a on a.event_id = e.id
left join (
  select event_id, count(*) as waitlist_count
  from public.event_attendees
  where status = 'waitlist'
  group by event_id
) w on w.event_id = e.id
left join (
  select event_id, count(*) as interested_count
  from public.event_attendees
  where status = 'interested'
  group by event_id
) i_attn on i_attn.event_id = e.id
left join (
  select event_id, count(*) as attended_count
  from public.event_attendees
  where status = 'attended'
  group by event_id
) att on att.event_id = e.id
left join (
  select event_id, count(*) as no_show_count
  from public.event_attendees
  where status = 'no_show'
  group by event_id
) ns on ns.event_id = e.id
left join (
  select event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews
  group by event_id
) r on r.event_id = e.id
left join public.profiles p on p.id = e.organizer_id
left join public.interests i on i.id = e.category_id
left join public.cities ci on ci.id = e.city_id;

alter view public.events_with_counts set (security_invoker = true);

comment on view public.events_with_counts is
  'Event row + denormalised counts (going/waitlist/interested/attended/no-show + reviews) '
  'plus organiser, category, city joins. Adds series_id/series_position so the UI can '
  'show "Yoga (4/8)" without an extra round-trip.';
