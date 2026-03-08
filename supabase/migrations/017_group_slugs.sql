-- Add slug column to groups for human-readable URLs: /{country}/{slug}
alter table public.groups add column if not exists slug text;

-- Unique constraint: slug must be unique within a country
create unique index if not exists idx_groups_country_slug
  on public.groups (country, slug)
  where slug is not null and country is not null;

-- Also ensure global slug uniqueness for groups without country
create unique index if not exists idx_groups_slug_global
  on public.groups (slug)
  where slug is not null and country is null;

-- Recreate groups_with_counts view to include slug
drop view if exists public.groups_with_counts;
create view public.groups_with_counts as
select
  g.*,
  coalesce(m.member_count, 0) as member_count,
  coalesce(e.event_count, 0) as event_count,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar
from public.groups g
left join (
  select group_id, count(*) as member_count
  from public.group_members group by group_id
) m on m.group_id = g.id
left join (
  select group_id, count(*) as event_count
  from public.events where status = 'published' group by group_id
) e on e.group_id = g.id
left join public.profiles p on p.id = g.created_by;
