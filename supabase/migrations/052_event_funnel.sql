-- ============================================================
-- City-Pulse: Event funnel analytics (view → RSVP → attended)
-- ============================================================
-- Goal: give organisers (and admins) a small but trustworthy funnel
-- per event so they can tell whether the bottleneck is reach
-- (low views), conversion (low RSVPs given views), or follow-through
-- (low attendance given RSVPs).
--
-- Design notes:
--   • We persist *de-duplicated* event_views — one row per
--     (event_id, user_id_or_session_hash, day_bucket). The day bucket
--     keeps the table linear-ish in event-page traffic and prevents
--     refresh-spamming from inflating the funnel.
--   • Anonymous viewers are bucketed by a sha256 fingerprint that
--     callers compute (IP + UA + day salt). We never store the raw
--     fingerprint inputs to stay on the right side of GDPR — only
--     the hash, and only for 90 days (cron will prune via
--     created_at index).
--   • RSVP and attended counts come from `event_attendees`, not from
--     a duplicate event log, so the funnel always agrees with what
--     the user sees in the UI.
--   • event_funnel is a regular (security_invoker) view so RLS still
--     applies — organisers see their own events, admins see all.
-- ============================================================

-- 1. event_views table
create table if not exists public.event_views (
  id bigserial primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  -- Authenticated viewer if known; otherwise NULL and we lean on
  -- session_hash for de-dup.
  user_id uuid references public.profiles(id) on delete set null,
  -- Sha256 hex digest of (ip || ua || YYYY-MM-DD). Generated client-
  -- side or in the server action; we never see the raw inputs.
  session_hash text,
  day_bucket date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);

-- Each (event, viewer, day) collapses to one row. We use a partial
-- unique index per identity dimension because user_id and
-- session_hash are mutually exclusive in practice.
create unique index if not exists idx_event_views_unique_user
  on public.event_views (event_id, user_id, day_bucket)
  where user_id is not null;

create unique index if not exists idx_event_views_unique_session
  on public.event_views (event_id, session_hash, day_bucket)
  where user_id is null and session_hash is not null;

create index if not exists idx_event_views_event
  on public.event_views (event_id, day_bucket desc);

create index if not exists idx_event_views_created
  on public.event_views (created_at desc);

alter table public.event_views enable row level security;

-- Only event organisers, event moderators, and site staff can read
-- views for their events. The funnel view inherits this since it's
-- security_invoker.
drop policy if exists "Organisers see own event views" on public.event_views;
create policy "Organisers see own event views"
  on public.event_views for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_views.event_id
        and (
          e.organizer_id = auth.uid()
          or exists (
            select 1 from public.event_moderators m
            where m.event_id = e.id and m.user_id = auth.uid()
          )
          or public.is_site_staff(auth.uid())
        )
    )
  );

-- Anyone (including anon) can record a view; the server action
-- decides whether to populate user_id or session_hash. We deliberately
-- leave the policy permissive because the unique indexes prevent
-- spam and RLS already gates reads.
drop policy if exists "Anyone can log an event view" on public.event_views;
create policy "Anyone can log an event view"
  on public.event_views for insert
  with check (true);

-- 2. record_event_view helper
-- Server action calls this with either a user_id or a session_hash.
-- ON CONFLICT DO NOTHING means refresh-spamming is a no-op.
create or replace function public.record_event_view(
  p_event_id uuid,
  p_user_id uuid default null,
  p_session_hash text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null then
    return;
  end if;

  -- We need at least one identity dimension; otherwise we can't
  -- de-dup and the row would be useless noise.
  if p_user_id is null and (p_session_hash is null or length(p_session_hash) = 0) then
    return;
  end if;

  insert into public.event_views (event_id, user_id, session_hash)
  values (p_event_id, p_user_id, nullif(p_session_hash, ''))
  on conflict do nothing;
end;
$$;

grant execute on function public.record_event_view(uuid, uuid, text) to anon, authenticated;

-- 3. event_funnel view
-- One row per event with the four headline metrics. We expose 7d and
-- 30d windows so dashboards can show short-term momentum without
-- another query.
drop view if exists public.event_funnel;
create view public.event_funnel as
select
  e.id as event_id,
  e.title,
  e.organizer_id,
  e.status,
  e.starts_at,
  -- Lifetime totals (since the row exists, that's "since publish").
  coalesce(v.views_total, 0) as views_total,
  coalesce(v.views_30d, 0) as views_30d,
  coalesce(v.views_7d, 0) as views_7d,
  coalesce(v.unique_viewers, 0) as unique_viewers,
  coalesce(rsvp.going_count, 0) as going_count,
  coalesce(att.attended_count, 0) as attended_count,
  coalesce(ns.no_show_count, 0) as no_show_count,
  -- Convenience ratios (NULL when the prior step is 0 — the UI
  -- should render "—" rather than 0% in that case).
  case when coalesce(v.unique_viewers, 0) = 0 then null
       else round((coalesce(rsvp.going_count, 0)::numeric
                  / nullif(v.unique_viewers, 0)) * 100, 1)
  end as view_to_rsvp_rate,
  case when coalesce(rsvp.going_count, 0) = 0 then null
       else round((coalesce(att.attended_count, 0)::numeric
                  / nullif(rsvp.going_count, 0)) * 100, 1)
  end as rsvp_to_attended_rate
from public.events e
left join (
  select
    event_id,
    count(*) as views_total,
    count(*) filter (where created_at >= now() - interval '30 days') as views_30d,
    count(*) filter (where created_at >= now() - interval '7 days') as views_7d,
    count(distinct coalesce(user_id::text, session_hash)) as unique_viewers
  from public.event_views
  group by event_id
) v on v.event_id = e.id
left join (
  select event_id, count(*) as going_count
  from public.event_attendees
  where status in ('going', 'attended')
  group by event_id
) rsvp on rsvp.event_id = e.id
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
) ns on ns.event_id = e.id;

alter view public.event_funnel set (security_invoker = true);

comment on view public.event_funnel is
  'Per-event funnel: views → RSVPs (going+attended) → attended → no-show. '
  'Inherits RLS from event_views and event_attendees, so organisers see only '
  'their own events. Use view_to_rsvp_rate / rsvp_to_attended_rate for charts.';
