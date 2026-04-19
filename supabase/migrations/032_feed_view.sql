-- Feed: index for global feed ordering + RPC for filtered feed query

create index if not exists idx_group_posts_published_at
  on public.group_posts(published_at desc);

create or replace function public.get_feed_posts(
  p_group_ids uuid[] default null,
  p_country text default null,
  p_city text default null,
  p_language text default null,
  p_type text default null,
  p_limit int default 30
)
returns table (
  id uuid,
  group_id uuid,
  group_name text,
  group_slug text,
  group_cover_url text,
  group_country text,
  group_city text
)
language sql stable
set search_path = public
as $$
  select
    gp.id,
    g.id        as group_id,
    g.name      as group_name,
    g.slug      as group_slug,
    g.cover_url as group_cover_url,
    g.country   as group_country,
    g.city      as group_city
  from public.group_posts gp
  join public.groups g on g.id = gp.group_id
  where g.is_blocked is not true
    and (p_group_ids is null or gp.group_id = any(p_group_ids))
    and (p_country is null or g.country = p_country)
    and (p_city is null or g.city = p_city)
    and (p_language is null or p_language = any(g.languages))
    and (p_type is null or gp.type = p_type)
  order by gp.published_at desc
  limit p_limit;
$$;
