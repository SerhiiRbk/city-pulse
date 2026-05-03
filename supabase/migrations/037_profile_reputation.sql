-- ============================================================
-- City-Pulse: Profile reputation + auto-awarded badges
-- ============================================================
-- Builds on Iteration B (RSVP-ladder): now that organizers mark
-- 'attended' / 'no_show', we can derive reliability metrics and
-- award badges automatically.
--
--   • profile_reputation view: attended_count, no_show_count,
--     attendance_rate, reliability_score (0–100), tier
--   • award_profile_badges(user_id) function: idempotent upsert
--     into user_badges based on thresholds
--   • triggers on event_attendees / events / event_reviews that
--     re-evaluate badges for the affected user(s)
-- ============================================================

-- 1. Ensure 'attended-10', 'attended-25', 'host-5' type slugs match existing badges.
--    Current badge slugs from migration 009:
--      newcomer, active-participant, organizer, top-organizer,
--      social-butterfly, explorer, reliable, community-builder
--    We reuse them — no new inserts needed.

-- 2. View: profile_reputation.
drop view if exists public.profile_reputation;
create view public.profile_reputation as
with attendance as (
  select
    user_id,
    count(*) filter (where status = 'attended') as attended_count,
    count(*) filter (where status = 'no_show') as no_show_count,
    count(*) filter (where status in ('going', 'attended')) as going_and_attended_count
  from public.event_attendees
  group by user_id
),
organized as (
  select
    organizer_id as user_id,
    count(*) as events_organized_count
  from public.events
  where status in ('published', 'completed')
  group by organizer_id
),
organizer_reviews as (
  select
    e.organizer_id as user_id,
    avg(r.rating)::numeric(3,2) as avg_organizer_rating,
    count(*) as organizer_review_count
  from public.event_reviews r
  join public.events e on e.id = r.event_id
  group by e.organizer_id
),
followers as (
  select
    target_user_id as user_id,
    count(*) as follower_count
  from public.user_subscriptions
  group by target_user_id
),
categories as (
  select
    ea.user_id,
    count(distinct e.category_id) as attended_category_count
  from public.event_attendees ea
  join public.events e on e.id = ea.event_id
  where ea.status = 'attended'
    and e.category_id is not null
  group by ea.user_id
)
select
  p.id as user_id,
  coalesce(a.attended_count, 0) as attended_count,
  coalesce(a.no_show_count, 0) as no_show_count,
  coalesce(a.going_and_attended_count, 0) as going_and_attended_count,
  coalesce(o.events_organized_count, 0) as events_organized_count,
  coalesce(orv.avg_organizer_rating, 0) as avg_organizer_rating,
  coalesce(orv.organizer_review_count, 0) as organizer_review_count,
  coalesce(f.follower_count, 0) as follower_count,
  coalesce(c.attended_category_count, 0) as attended_category_count,
  case
    when coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) = 0 then null
    else round(
      (a.attended_count::numeric
        / nullif(a.attended_count + a.no_show_count, 0)) * 100
    , 2)
  end as attendance_rate,
  -- reliability_score: 0–100. Weights 70% attendance_rate + 30% volume saturation
  -- (capped at 10 attended). Users with zero outcome rows score 0.
  case
    when coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) = 0 then 0
    else greatest(0, least(100, round(
      (a.attended_count::numeric
        / nullif(a.attended_count + a.no_show_count, 0)) * 70
      + least(a.attended_count::numeric / 10, 1) * 30
    )::int))
  end as reliability_score,
  case
    when coalesce(a.attended_count, 0) < 3 then 'newcomer'
    when coalesce(a.attended_count, 0) >= 10
      and coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) > 0
      and (a.attended_count::numeric
            / nullif(a.attended_count + a.no_show_count, 0)) * 70
          + least(a.attended_count::numeric / 10, 1) * 30 >= 80
      then 'elite'
    when coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) > 0
      and (a.attended_count::numeric
            / nullif(a.attended_count + a.no_show_count, 0)) * 70
          + least(a.attended_count::numeric / 10, 1) * 30 >= 50
      then 'trusted'
    else 'regular'
  end as tier
from public.profiles p
left join attendance a on a.user_id = p.id
left join organized o on o.user_id = p.id
left join organizer_reviews orv on orv.user_id = p.id
left join followers f on f.user_id = p.id
left join categories c on c.user_id = p.id;

alter view public.profile_reputation set (security_invoker = true);

-- 3. Badge thresholds. One function keeps all rules in one place and is
--    idempotent (insert .. on conflict do nothing). Removing a threshold
--    never revokes an already-awarded badge — that is intentional so the
--    badge cabinet is append-only and users can't "lose" recognition.
create or replace function public.award_profile_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.profile_reputation where user_id = p_user_id;
  if not found then return; end if;

  -- newcomer: first attended event
  if r.attended_count >= 1 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'newcomer'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- active-participant: 5+ attended events
  if r.attended_count >= 5 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'active-participant'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- reliable: attended >= 5 AND attendance_rate >= 90%
  if r.attended_count >= 5 and coalesce(r.attendance_rate, 0) >= 90 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'reliable'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- organizer: 3+ events organized (published or completed)
  if r.events_organized_count >= 3 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'organizer'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- top-organizer: 10+ events AND avg_rating >= 4.5 AND >= 10 reviews
  if r.events_organized_count >= 10
     and r.avg_organizer_rating >= 4.5
     and r.organizer_review_count >= 10 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'top-organizer'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- social-butterfly: 20+ followers
  if r.follower_count >= 20 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'social-butterfly'
      on conflict (user_id, badge_id) do nothing;
  end if;

  -- explorer: attended in 5+ distinct categories
  if r.attended_category_count >= 5 then
    insert into public.user_badges (user_id, badge_id)
      select p_user_id, id from public.badges where slug = 'explorer'
      on conflict (user_id, badge_id) do nothing;
  end if;
end;
$$;

revoke all on function public.award_profile_badges(uuid) from public;
grant execute on function public.award_profile_badges(uuid)
  to authenticated, service_role;

-- 4. Triggers: re-evaluate badges when meaningful state changes.
--
--    On event_attendees: status → attended / no_show / going affects both
--    attendance counts and — for organizers — never (organizer_id comes from events).
create or replace function public.trg_award_on_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.award_profile_badges(old.user_id);
    return old;
  end if;
  perform public.award_profile_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_event_attendees_award on public.event_attendees;
create trigger trg_event_attendees_award
  after insert or update or delete on public.event_attendees
  for each row
  execute function public.trg_award_on_attendance();

-- On events: when an event is published or completed, the organizer
-- may qualify for the 'organizer' / 'top-organizer' badges.
create or replace function public.trg_award_on_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.award_profile_badges(old.organizer_id);
    return old;
  end if;
  if new.status in ('published', 'completed')
     or (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    perform public.award_profile_badges(new.organizer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_award on public.events;
create trigger trg_events_award
  after insert or update or delete on public.events
  for each row
  execute function public.trg_award_on_event_status();

-- On event_reviews: affects avg_organizer_rating.
create or replace function public.trg_award_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizer uuid;
begin
  select organizer_id into v_organizer
    from public.events
    where id = coalesce(new.event_id, old.event_id);
  if v_organizer is null then
    return coalesce(new, old);
  end if;
  perform public.award_profile_badges(v_organizer);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_event_reviews_award on public.event_reviews;
create trigger trg_event_reviews_award
  after insert or update or delete on public.event_reviews
  for each row
  execute function public.trg_award_on_review();

-- On user_subscriptions: affects follower_count → social-butterfly.
create or replace function public.trg_award_on_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_profile_badges(coalesce(new.target_user_id, old.target_user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_subscriptions_award on public.user_subscriptions;
create trigger trg_user_subscriptions_award
  after insert or delete on public.user_subscriptions
  for each row
  execute function public.trg_award_on_subscription();

-- 5. One-shot backfill for all existing profiles.
do $$
declare
  uid uuid;
begin
  for uid in select id from public.profiles loop
    perform public.award_profile_badges(uid);
  end loop;
end;
$$;
