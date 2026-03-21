-- Add admin blocking controls for profiles, events, and groups

alter table public.profiles
  add column if not exists is_blocked boolean not null default false;

alter table public.events
  add column if not exists is_blocked boolean not null default false;

alter table public.groups
  add column if not exists is_blocked boolean not null default false;

create index if not exists idx_profiles_is_blocked on public.profiles(is_blocked);
create index if not exists idx_events_is_blocked on public.events(is_blocked);
create index if not exists idx_groups_is_blocked on public.groups(is_blocked);

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
  select event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews
  group by event_id
) r on r.event_id = e.id
left join public.profiles p on p.id = e.organizer_id
left join public.interests i on i.id = e.category_id
left join public.cities ci on ci.id = e.city_id;

drop view if exists public.groups_with_counts;
create view public.groups_with_counts as
select
  g.id,
  g.name,
  g.description,
  g.cover_url,
  g.created_by,
  g.created_at,
  g.updated_at,
  g.country,
  g.city,
  g.slug,
  g.city_id,
  coalesce(m.member_count, 0) as member_count,
  coalesce(ev.event_count, 0) as event_count,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar,
  ci.name as city_name,
  ci.translations as city_translations,
  g.languages,
  g.is_blocked,
  coalesce(p.is_blocked, false) as creator_is_blocked
from public.groups g
left join (
  select group_id, count(*) as member_count
  from public.group_members
  group by group_id
) m on m.group_id = g.id
left join (
  select group_id, count(*) as event_count
  from public.events
  where status = 'published'
  group by group_id
) ev on ev.group_id = g.id
left join public.profiles p on p.id = g.created_by
left join public.cities ci on ci.id = g.city_id;

alter view public.events_with_counts
  set (security_invoker = true);

alter view public.groups_with_counts
  set (security_invoker = true);
