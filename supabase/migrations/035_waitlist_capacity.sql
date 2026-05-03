-- ============================================================
-- City-Pulse: Waitlist + Capacity enforcement
-- ============================================================
-- Enforces events.max_attendees on event_attendees.status transitions:
--   • When inserting/updating to 'going', if going_count >= max_attendees,
--     status is flipped to 'waitlist' BEFORE the row is written.
--   • When a 'going' attendee leaves (delete, or status → cancelled/waitlist),
--     the earliest 'waitlist' attendee is auto-promoted to 'going',
--     and a notification is enqueued for the promoted user.
--
-- Also refreshes events_with_counts to expose waitlist_count.
-- ============================================================

-- 1. Index to serve FIFO waitlist promotion and admin panels efficiently.
create index if not exists idx_event_attendees_event_status_created
  on public.event_attendees (event_id, status, created_at);

-- 2. Widen notifications.type check to include 'promoted_from_waitlist'.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_comment',
    'new_message', 'chat_request', 'group_new_event', 'system',
    'promoted_from_waitlist'
  ));

-- 3. BEFORE trigger: enforce capacity by flipping status to 'waitlist'.
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_attendees integer;
  v_going_count integer;
begin
  -- Only relevant when the target status is 'going'.
  if new.status is distinct from 'going' then
    return new;
  end if;

  -- If the row already was 'going' and hasn't changed, nothing to enforce.
  if tg_op = 'UPDATE' and old.status = 'going' then
    return new;
  end if;

  select max_attendees into v_max_attendees
    from public.events
    where id = new.event_id;

  -- No cap configured → allow.
  if v_max_attendees is null then
    return new;
  end if;

  select count(*)::int into v_going_count
    from public.event_attendees
    where event_id = new.event_id
      and status = 'going'
      -- Exclude the row being updated from the count if it is already 'going'
      -- (defensive; we already short-circuited that case above).
      and not (tg_op = 'UPDATE' and user_id = old.user_id);

  if v_going_count >= v_max_attendees then
    new.status := 'waitlist';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_event_attendees_enforce_capacity on public.event_attendees;
create trigger trg_event_attendees_enforce_capacity
  before insert or update on public.event_attendees
  for each row
  execute function public.enforce_event_capacity();

-- 4. AFTER trigger: promote earliest waitlist entry when a 'going' slot frees up.
create or replace function public.promote_waitlist_on_slot_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_max_attendees integer;
  v_going_count integer;
  v_promoted_user uuid;
  v_event_title text;
begin
  -- Decide whether a slot has opened.
  if tg_op = 'DELETE' then
    if old.status is distinct from 'going' then
      return old;
    end if;
    v_event_id := old.event_id;
  elsif tg_op = 'UPDATE' then
    if old.status = 'going' and new.status is distinct from 'going' then
      v_event_id := new.event_id;
    else
      return new;
    end if;
  else
    return new;
  end if;

  select max_attendees, title into v_max_attendees, v_event_title
    from public.events
    where id = v_event_id;

  -- Without a cap there is no waitlist to promote.
  if v_max_attendees is null then
    return coalesce(new, old);
  end if;

  select count(*)::int into v_going_count
    from public.event_attendees
    where event_id = v_event_id
      and status = 'going';

  if v_going_count >= v_max_attendees then
    return coalesce(new, old);
  end if;

  -- Promote earliest waitlist entry (FIFO).
  update public.event_attendees
    set status = 'going'
    where event_id = v_event_id
      and status = 'waitlist'
      and (event_id, user_id) = (
        select event_id, user_id
          from public.event_attendees
          where event_id = v_event_id
            and status = 'waitlist'
          order by created_at asc
          limit 1
      )
  returning user_id into v_promoted_user;

  if v_promoted_user is null then
    return coalesce(new, old);
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_promoted_user,
    'promoted_from_waitlist',
    coalesce(v_event_title, 'Event') || ' — a spot opened for you',
    'You were moved from the waitlist to going. See you there!',
    jsonb_build_object('event_id', v_event_id)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_event_attendees_promote_waitlist on public.event_attendees;
create trigger trg_event_attendees_promote_waitlist
  after update or delete on public.event_attendees
  for each row
  execute function public.promote_waitlist_on_slot_open();

-- 5. Refresh events_with_counts to expose waitlist_count.
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
  select event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews
  group by event_id
) r on r.event_id = e.id
left join public.profiles p on p.id = e.organizer_id
left join public.interests i on i.id = e.category_id
left join public.cities ci on ci.id = e.city_id;

alter view public.events_with_counts set (security_invoker = true);
