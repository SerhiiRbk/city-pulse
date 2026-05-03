-- ============================================================
-- City-Pulse: RSVP visibility + safety tags
-- ============================================================
-- Two related concerns rolled into a single migration so the data
-- model evolves in lockstep:
--
-- 1. `event_attendees.is_visible` lets a participant join an event
--    without broadcasting their identity in the public roster. This
--    is critical for sensitive themes (mental health groups, dating,
--    women-only meetups) where attendance itself can be private.
--    The column defaults to TRUE so existing rows keep their old
--    behaviour.
--
-- 2. `events.safety_tags text[]` is a controlled vocabulary of
--    event-level audience guardrails. We avoid free-form to prevent
--    the tag space from drifting; the constraint enforces only
--    values we actively support in UI + filters.
--
--    Current vocabulary:
--      * women_only        — attendance restricted to women.
--      * adults_only       — 18+ only (dating, alcohol-heavy, etc.).
--      * lgbtq_friendly    — explicitly inclusive space.
--      * sober             — alcohol-free environment.
--      * beginner_friendly — newcomer-oriented; no prior experience needed.
--
--    UI surfaces these as badges; filters expose them as chips.
-- ============================================================

-- ---- 1. RSVP privacy --------------------------------------------
alter table public.event_attendees
  add column if not exists is_visible boolean not null default true;

comment on column public.event_attendees.is_visible is
  'When false, the row is hidden from public attendee rosters. Counts still reflect the row, but display name + avatar are not exposed.';

-- Quick filter for the public roster query.
create index if not exists idx_event_attendees_visible
  on public.event_attendees (event_id, status)
  where is_visible = true;

-- ---- 2. Safety tags ---------------------------------------------
alter table public.events
  add column if not exists safety_tags text[] not null default '{}';

-- Validate values stay inside the controlled vocabulary. We accept
-- the empty array and any subset of the allowed tags. Using
-- `<@` (subset) is faster than per-element checks.
alter table public.events
  drop constraint if exists events_safety_tags_check;
alter table public.events
  add constraint events_safety_tags_check
  check (
    safety_tags <@ array[
      'women_only',
      'adults_only',
      'lgbtq_friendly',
      'sober',
      'beginner_friendly'
    ]::text[]
  );

comment on column public.events.safety_tags is
  'Controlled-vocabulary audience tags. Surfaced in UI badges and filters. Limited set keeps the taxonomy tight.';

create index if not exists idx_events_safety_tags
  on public.events using gin (safety_tags);

-- ---- 3. Refresh views to expose new columns --------------------
-- Re-issue the same column lists used in migration 049 and append
-- the two new columns at the end. Keeping previous order stable
-- avoids breaking any consumers that read columns positionally.

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
  e.safety_tags
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
