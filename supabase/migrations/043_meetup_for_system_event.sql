-- ============================================================
-- City-Pulse: meetup semantics on top of system events
-- ============================================================
-- A "meetup" is a regular community event (is_system = false) that points
-- at a parent system event via `parent_system_event_id`. This lets people
-- coordinate "let's meet up at this concert" without ever conflating that
-- private RSVP with the editorial city listing.
--
-- This migration:
--   1. Adds the `parent_system_event_id` FK on `events` with on-delete
--      `set null` so that retiring a system event does not cascade and
--      destroy its meetups (we want the meetups to live on, optionally
--      flagged as "parent removed" by the application layer).
--   2. Creates a partial index for fast "list meetups for system event X"
--      queries used by the /events/[id] view of system events.
--   3. Installs a trigger that enforces the relational invariants:
--        a) the parent event must exist and must itself be a system event;
--        b) a system event cannot have a parent (no nested editorial chains);
--        c) `parent_system_event_id` cannot equal the row's own id.
--   4. Rebuilds `events_with_counts` to surface the new column so listings
--      can show "child of Афиша X" badges without re-querying.
-- ============================================================

-- 1. Schema: nullable FK + index.
alter table public.events
  add column if not exists parent_system_event_id uuid
    references public.events(id) on delete set null;

create index if not exists idx_events_parent_system_event
  on public.events (parent_system_event_id)
  where parent_system_event_id is not null;

-- 2. Trigger: enforce parent-must-be-system + child-must-not-be-system.
create or replace function public.check_meetup_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_is_system boolean;
begin
  if new.parent_system_event_id is null then
    return new;
  end if;

  if new.parent_system_event_id = new.id then
    raise exception 'parent_system_event_id cannot reference the same event'
      using errcode = 'check_violation';
  end if;

  if new.is_system is true then
    raise exception 'system events cannot themselves be meetups (event_id=%)', new.id
      using errcode = 'check_violation';
  end if;

  select is_system into v_parent_is_system
    from public.events
   where id = new.parent_system_event_id;

  if v_parent_is_system is null then
    raise exception 'parent_system_event_id=% does not exist', new.parent_system_event_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_parent_is_system is false then
    raise exception 'parent_system_event_id=% is not a system event', new.parent_system_event_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_meetup_parent on public.events;
create trigger trg_check_meetup_parent
  before insert or update of parent_system_event_id, is_system on public.events
  for each row execute function public.check_meetup_parent();

comment on function public.check_meetup_parent() is
  'Validates that a meetup''s parent_system_event_id points to an existing system event and the row itself is not a system event.';

-- 3. Rebuild the events_with_counts view to expose parent_system_event_id.
--    Keeps every other column from migration 039 byte-identical.
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
