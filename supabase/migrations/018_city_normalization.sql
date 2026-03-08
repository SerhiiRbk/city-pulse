-- City normalization: add city_id FK to events, groups, profiles
-- The cities table already exists from 001_initial_schema.sql

-- Allow authenticated users to upsert cities (for Nominatim fallback)
create policy "Authenticated users can update cities"
  on public.cities for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Add city_id columns
alter table public.events add column if not exists city_id uuid references public.cities(id);
alter table public.groups add column if not exists city_id uuid references public.cities(id);
alter table public.profiles add column if not exists city_id uuid references public.cities(id);

-- Indexes for filtering
create index if not exists idx_events_city_id on public.events(city_id);
create index if not exists idx_groups_city_id on public.groups(city_id);
create index if not exists idx_profiles_city_id on public.profiles(city_id);

-- Full-text search function for cities across name + translations
create or replace function public.search_cities(query text, country_filter text default null)
returns setof public.cities
language sql stable
as $$
  select c.*
  from public.cities c
  where (
    c.name ilike '%' || query || '%'
    or exists (
      select 1
      from jsonb_each_text(c.translations) as t(lang, val)
      where t.val ilike '%' || query || '%'
    )
  )
  and (country_filter is null or c.country = country_filter)
  order by
    case when c.name ilike query then 0
         when c.name ilike query || '%' then 1
         else 2
    end,
    c.name
  limit 10;
$$;

-- Recreate events_with_counts view to include city_id and city translations
drop view if exists public.events_with_counts;
create view public.events_with_counts as
select
  e.*,
  coalesce(a.going_count, 0) as going_count,
  coalesce(r.avg_rating, 0) as avg_rating,
  coalesce(r.review_count, 0) as review_count,
  p.display_name as organizer_name,
  p.avatar_url as organizer_avatar,
  i.slug as category_slug,
  i.translations as category_translations,
  ci.name as city_name,
  ci.translations as city_translations
from public.events e
left join (
  select event_id, count(*) as going_count
  from public.event_attendees where status = 'going' group by event_id
) a on a.event_id = e.id
left join (
  select event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews group by event_id
) r on r.event_id = e.id
left join public.profiles p on p.id = e.organizer_id
left join public.interests i on i.id = e.category_id
left join public.cities ci on ci.id = e.city_id;

-- Recreate groups_with_counts view to include city_id and city translations
drop view if exists public.groups_with_counts;
create view public.groups_with_counts as
select
  g.*,
  coalesce(m.member_count, 0) as member_count,
  coalesce(ev.event_count, 0) as event_count,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar,
  ci.name as city_name,
  ci.translations as city_translations
from public.groups g
left join (
  select group_id, count(*) as member_count
  from public.group_members group by group_id
) m on m.group_id = g.id
left join (
  select group_id, count(*) as event_count
  from public.events where status = 'published' group by group_id
) ev on ev.group_id = g.id
left join public.profiles p on p.id = g.created_by
left join public.cities ci on ci.id = g.city_id;
