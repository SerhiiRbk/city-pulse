-- ============================================================
-- City-Pulse: Full-text search for events + groups
-- ============================================================
-- We use Postgres' built-in `tsvector` with the 'simple' config
-- so we can index Russian, Ukrainian, Czech, German, and English
-- content with the same column. The 'simple' dictionary doesn't
-- stem (e.g. it won't collapse "groups" / "grouping" together)
-- but in exchange:
--   * supports any language without per-language config;
--   * unlocks prefix matching via to_tsquery('simple', 'foo:*'),
--     which is the dominant query shape in our search box.
--
-- Each table gets a STORED generated `search_tsv` column derived
-- from title + plain description + city + tag-like fields. A GIN
-- index makes lookups O(log n) and immune to row growth.
-- ============================================================

-- ---- 1. Events --------------------------------------------------
alter table public.events
  add column if not exists search_tsv tsvector
    generated always as (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(address, '')), 'D')
    ) stored;

create index if not exists idx_events_search_tsv
  on public.events using gin (search_tsv);

-- ---- 2. Groups --------------------------------------------------
alter table public.groups
  add column if not exists search_tsv tsvector
    generated always as (
      setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(city, '')), 'B')
    ) stored;

create index if not exists idx_groups_search_tsv
  on public.groups using gin (search_tsv);

-- ---- 3. Helper function ----------------------------------------
-- Wraps user input into a `tsquery` that:
--   * splits on whitespace + punctuation (`plainto_tsquery` style);
--   * tacks `:*` onto the last token so we get prefix matching
--     for "as the user types" queries — this is what people
--     intuitively expect from search-as-you-type UIs.
-- Returns NULL for empty / whitespace-only input so callers can
-- skip the filter entirely.
create or replace function public.search_tsquery(q text)
returns tsquery
language sql
immutable
as $$
  with cleaned as (
    select regexp_replace(part, '[^[:alnum:]]+', '', 'g') as token
    from unnest(regexp_split_to_array(coalesce(btrim(q), ''), '\s+')) as part
  )
  select case
    when count(*) filter (where token <> '') = 0 then null
    else to_tsquery(
      'simple',
      string_agg(token, ' & ' order by token) filter (where token <> '') || ':*'
    )
  end
  from cleaned;
$$;

-- ---- 4. Refresh views to expose search_tsv ---------------------
-- Re-issue the same view definitions used in migration 046 and
-- only add `search_tsv` at the end so column ordering stays stable
-- for downstream code.

drop view if exists public.events_with_counts;
create view public.events_with_counts as
select
  e.id,
  e.title,
  e.description,
  e.description_json,
  e.photos,
  e.category_id,
  e.starts_at,
  e.ends_at,
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
  coalesce(p.is_blocked, false) as organizer_is_blocked,
  e.search_tsv
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

drop view if exists public.groups_with_counts;
create view public.groups_with_counts as
select
  g.id,
  g.name,
  g.description,
  g.description_json,
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
  coalesce(p.is_blocked, false) as creator_is_blocked,
  g.search_tsv
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

alter view public.groups_with_counts set (security_invoker = true);
