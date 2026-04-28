-- ============================================================
-- City-Pulse: rich text descriptions for events and groups
-- ============================================================
-- Same shape as migration 045 (`group_posts.content_json`):
--   * `description_json jsonb` stores a TipTap / ProseMirror doc;
--   * legacy plain `description` becomes a server-derived mirror
--     auto-populated by a BEFORE-trigger from the JSON document;
--   * legacy rows are left untouched (lazy backfill: a row only
--     gains JSON the first time someone re-edits it). The renderer
--     falls back to `description` (linkified) when the JSON column
--     is NULL, so old rows look identical to today.
--
-- Why we mirror the plain text:
--   * cards / feed previews / OpenGraph descriptions / SEO snippets
--     keep using plain text (cheap to clamp, easy to truncate);
--   * full-text search on `description` keeps working;
--   * any old client that hasn't been redeployed continues to read
--     from `description` without crashing.
--
-- Both views (`events_with_counts`, `groups_with_counts`) are
-- rebuilt to surface `description_json` so detail pages can render
-- the rich body via a single `from(view).select('*')`.
--
-- The plain-text extractor `tiptap_doc_to_text(jsonb)` is reused
-- from migration 045 — that function intentionally lives in the
-- public schema with no consumer-specific assumptions.
-- ============================================================

-- 1. Storage columns -----------------------------------------------------------

alter table public.events
  add column if not exists description_json jsonb;

alter table public.groups
  add column if not exists description_json jsonb;

comment on column public.events.description_json is
  'TipTap / ProseMirror document for the event description. NULL for legacy rows that have not been re-edited since migration 046.';
comment on column public.events.description is
  'Plain-text description. When `description_json` is non-null this is auto-derived from it by a trigger; otherwise it''s authored directly.';

comment on column public.groups.description_json is
  'TipTap / ProseMirror document for the group description. NULL for legacy rows that have not been re-edited since migration 046.';
comment on column public.groups.description is
  'Plain-text description. When `description_json` is non-null this is auto-derived from it by a trigger; otherwise it''s authored directly.';

-- 2. Sync triggers -------------------------------------------------------------
--
-- Both triggers follow the exact pattern from migration 045 for
-- `group_posts.content_json`:
--   * if `description_json` is NULL we keep `description` as-is
--     (this is the legacy plain-text path, plus the carve-out for
--     callers that explicitly want to write only plain text);
--   * otherwise we re-derive the plain mirror from the doc, cap
--     it at 4000 chars to match the application-side Zod limit,
--     and refuse to write a doc whose visible text would collapse
--     to "" (defends the column against a misbehaving caller).

create or replace function public.events_sync_description_plain()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  derived text;
begin
  if new.description_json is null then
    return new;
  end if;

  derived := trim(public.tiptap_doc_to_text(new.description_json));

  if derived = '' then
    raise exception 'events.description_json must contain at least one text node';
  end if;

  if length(derived) > 4000 then
    derived := substring(derived from 1 for 4000);
  end if;

  new.description := derived;
  return new;
end;
$$;

drop trigger if exists trg_events_sync_description_plain on public.events;
create trigger trg_events_sync_description_plain
  before insert or update of description_json on public.events
  for each row
  execute function public.events_sync_description_plain();

create or replace function public.groups_sync_description_plain()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  derived text;
begin
  if new.description_json is null then
    return new;
  end if;

  derived := trim(public.tiptap_doc_to_text(new.description_json));

  if derived = '' then
    raise exception 'groups.description_json must contain at least one text node';
  end if;

  if length(derived) > 4000 then
    derived := substring(derived from 1 for 4000);
  end if;

  new.description := derived;
  return new;
end;
$$;

drop trigger if exists trg_groups_sync_description_plain on public.groups;
create trigger trg_groups_sync_description_plain
  before insert or update of description_json on public.groups
  for each row
  execute function public.groups_sync_description_plain();

-- 3. Indexes -------------------------------------------------------------------
--
-- `gin (jsonb_path_ops)` is the smallest index variant that supports
-- `@>` containment queries. We don't index full paths because the
-- rich body is not a query target today; this index just keeps the
-- door open for future structural search.

create index if not exists idx_events_description_json
  on public.events using gin (description_json jsonb_path_ops)
  where description_json is not null;

create index if not exists idx_groups_description_json
  on public.groups using gin (description_json jsonb_path_ops)
  where description_json is not null;

-- 4. Rebuild views to expose `description_json` -------------------------------
--
-- Both views are explicit-column projections (so we can preserve
-- column ordering across migrations and avoid surprises when the
-- underlying tables grow). We re-list every column from migration
-- 043 / 028 verbatim and append `description_json` at the end so
-- existing `select *` consumers keep working with no API drift.

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

alter view public.groups_with_counts set (security_invoker = true);
