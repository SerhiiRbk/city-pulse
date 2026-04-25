-- ============================================================
-- City-Pulse: RSVP-ladder (interested / going / waitlist / attended / no_show / cancelled)
-- ============================================================
-- Extends event_attendees.status with soft-commitment ('interested') and
-- post-event outcome states ('attended', 'no_show'). Tightens RLS so that:
--   • Attendees can only self-assign 'interested', 'going', 'waitlist', 'cancelled'.
--   • Only organizers / event moderators / site staff can set 'attended' / 'no_show'.
-- Refreshes events_with_counts to expose interested_count / attended_count.
-- ============================================================

-- 1. Widen the status check constraint.
alter table public.event_attendees
  drop constraint if exists event_attendees_status_check;

alter table public.event_attendees
  add constraint event_attendees_status_check
  check (status in ('interested', 'going', 'waitlist', 'attended', 'no_show', 'cancelled'));

-- 2. Rewrite RLS so non-staff can't grant themselves 'attended' / 'no_show'.
drop policy if exists "Users can manage own attendance" on public.event_attendees;
drop policy if exists "Users can update own attendance" on public.event_attendees;
drop policy if exists "Users can cancel own attendance" on public.event_attendees;
drop policy if exists "Organizers can mark attendance" on public.event_attendees;
drop policy if exists "Event moderators can mark attendance" on public.event_attendees;

-- Attendees insert their own RSVP (trigger can still downgrade 'going' → 'waitlist').
create policy "Users can insert own RSVP"
  on public.event_attendees for insert
  with check (
    auth.uid() = user_id
    and status in ('interested', 'going', 'waitlist', 'cancelled')
  );

-- Attendees can move between soft/pending states; trigger still handles capacity.
create policy "Users can update own RSVP"
  on public.event_attendees for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and status in ('interested', 'going', 'waitlist', 'cancelled')
  );

-- Attendees can leave.
create policy "Users can delete own RSVP"
  on public.event_attendees for delete
  using (auth.uid() = user_id);

-- Organizers may flip attendees to 'attended' / 'no_show' (or back to 'going').
create policy "Organizers can mark attendance"
  on public.event_attendees for update
  using (
    exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_attendees.event_id
        and e.organizer_id = auth.uid()
    )
    and status in ('attended', 'no_show', 'going')
  );

-- Event moderators get the same capability as organizers for marking attendance.
create policy "Event moderators can mark attendance"
  on public.event_attendees for update
  using (
    exists (
      select 1 from public.event_moderators m
      where m.event_id = event_attendees.event_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.event_moderators m
      where m.event_id = event_attendees.event_id
        and m.user_id = auth.uid()
    )
    and status in ('attended', 'no_show', 'going')
  );

-- Site staff (admin / moderator / system) retain override for dashboards and cleanup.
create policy "Site staff can update attendance"
  on public.event_attendees for update
  using (public.is_site_staff(auth.uid()))
  with check (public.is_site_staff(auth.uid()));

-- 3. Refresh events_with_counts to include interested_count + attended_count.
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
