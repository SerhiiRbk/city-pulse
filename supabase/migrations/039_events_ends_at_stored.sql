-- ============================================================
-- 039: Promote `events.ends_at` to a real column + index
--
-- Why: migration 038 exposed `ends_at` as a computed expression on the
-- `events_with_counts` view. That works for correctness, but every
-- query that filters on `ends_at` has to evaluate the expression for
-- each row. As discovery (events listing, "my events", landing) and a
-- new mark-completed cron all rely on `ends_at`, we promote it to a
-- physical column on `events` and add a btree index for fast range
-- scans. The view is then simplified to read the column directly.
--
-- Why a trigger and not `generated always as ... stored`:
--   In Postgres, `timestamptz + interval` is marked STABLE (not
--   IMMUTABLE) because in the general case an interval may contain
--   months/years and the result depends on the session timezone.
--   That makes the expression illegal in both stored generated
--   columns and expression indexes (Postgres errors with
--   "generation expression is not immutable"). Equivalent IMMUTABLE
--   re-expressions like `to_timestamp(extract(epoch …))` also fail
--   because `date_part(text, timestamptz)` is STABLE as well.
--
--   Maintaining the column from a BEFORE INSERT/UPDATE trigger gives
--   us the same guarantee (the value cannot drift from
--   `starts_at + duration_minutes * 1 minute`), is fully indexable,
--   and is portable across Postgres versions.
--
-- Idempotency: the migration is safe to re-run, and will gracefully
-- replace a previous (broken) attempt to add `ends_at` as a generated
-- stored column.
-- ============================================================

-- 1. Make sure `ends_at` exists as a *plain* timestamptz column.
--    If a previous run of this migration succeeded in some
--    environment in adding it as a generated column, drop it first
--    so we can recreate it as a regular column.
do $$
declare
  v_attgenerated "char";
begin
  select a.attgenerated
    into v_attgenerated
  from pg_attribute a
  where a.attrelid = 'public.events'::regclass
    and a.attname  = 'ends_at'
    and not a.attisdropped;

  if v_attgenerated is null then
    -- column does not exist yet — add as a plain column
    execute 'alter table public.events add column ends_at timestamptz';
  elsif v_attgenerated <> '' then
    -- existing column is generated; drop and recreate as plain so we
    -- can maintain it from a trigger
    execute 'alter table public.events drop column ends_at';
    execute 'alter table public.events add column ends_at timestamptz';
  end if;
end
$$;

-- 2. Backfill any rows that don't yet have an `ends_at` value. Both
--    `starts_at` and `duration_minutes` are NOT NULL on `events`
--    (defined in 001), so the expression is always defined.
update public.events
set ends_at = starts_at + (duration_minutes * interval '1 minute')
where ends_at is null;

-- 3. With every row backfilled, enforce NOT NULL going forward so the
--    column can be used safely in indexes and joins.
alter table public.events
  alter column ends_at set not null;

-- 4. Trigger keeps `ends_at` in lock-step with `starts_at` /
--    `duration_minutes`. We listen on UPDATE OF those two columns so
--    UPDATE statements that don't touch the timing fields are not
--    needlessly re-running the assignment. INSERTs always go through
--    the trigger, so a fresh row will always get a correct
--    `ends_at`, even if the caller forgot to set it.
create or replace function public.events_set_ends_at()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is not null and new.duration_minutes is not null then
    new.ends_at := new.starts_at + (new.duration_minutes * interval '1 minute');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_set_ends_at on public.events;
create trigger trg_events_set_ends_at
  before insert or update of starts_at, duration_minutes on public.events
  for each row
  execute function public.events_set_ends_at();

-- 5. Indexes for the cron + listings.
create index if not exists idx_events_ends_at
  on public.events (ends_at);

-- Compound index for the common "events that haven't ended yet, sorted
-- by start time" pattern used by listings.
create index if not exists idx_events_ends_at_status
  on public.events (status, ends_at)
  where status = 'published';

-- 6. Rebuild the view so it reads the physical column instead of
--    recomputing `ends_at` per row (matches definition from 038 with
--    `e.ends_at` swapped in).
drop view if exists public.events_with_counts;

create view public.events_with_counts as
select
  e.id,
  e.title,
  e.description,
  e.photos,
  e.category_id,
  e.starts_at,
  e.duration_minutes,
  e.ends_at,
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
  coalesce(p.is_blocked, false) as organizer_is_blocked
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
