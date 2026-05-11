-- ============================================================
-- 069: Event title/description translations
--
-- Adds `title_translations JSONB` column to events table.
-- Format: { "en": "English title", "ru": "Русское название", ... }
--
-- The existing `title` and `description` columns remain the
-- default/fallback values. When a viewer's locale has a key in
-- title_translations, that value is used instead.
--
-- description_translations stores plain-text locale overrides
-- (separate from the rich-text description_json).
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS title_translations JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description_translations JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.events.title_translations IS
  'Locale-keyed title overrides. Format: {"en": "...", "cs": "..."}. Falls back to `title` when the viewer locale has no entry.';

COMMENT ON COLUMN public.events.description_translations IS
  'Locale-keyed plain-text description overrides. Format: {"en": "...", "ru": "..."}. Falls back to `description` when the viewer locale has no entry.';

-- Rebuild events_with_counts to expose new columns
DROP VIEW IF EXISTS public.events_with_counts;
CREATE VIEW public.events_with_counts AS
SELECT
  e.id,
  e.title,
  e.title_translations,
  e.description,
  e.description_translations,
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
  e.search_tsv,
  e.safety_tags,
  e.series_id,
  e.series_position
FROM public.events e
LEFT JOIN (
  SELECT event_id, count(*) as going_count
  FROM public.event_attendees
  WHERE status = 'going'
  GROUP BY event_id
) a ON a.event_id = e.id
LEFT JOIN (
  SELECT event_id, count(*) as waitlist_count
  FROM public.event_attendees
  WHERE status = 'waitlist'
  GROUP BY event_id
) w ON w.event_id = e.id
LEFT JOIN (
  SELECT event_id, count(*) as interested_count
  FROM public.event_attendees
  WHERE status = 'interested'
  GROUP BY event_id
) i_attn ON i_attn.event_id = e.id
LEFT JOIN (
  SELECT event_id, count(*) as attended_count
  FROM public.event_attendees
  WHERE status = 'attended'
  GROUP BY event_id
) att ON att.event_id = e.id
LEFT JOIN (
  SELECT event_id, count(*) as no_show_count
  FROM public.event_attendees
  WHERE status = 'no_show'
  GROUP BY event_id
) ns ON ns.event_id = e.id
LEFT JOIN (
  SELECT event_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
  FROM public.event_reviews
  GROUP BY event_id
) r ON r.event_id = e.id
LEFT JOIN public.profiles p ON p.id = e.organizer_id
LEFT JOIN public.interests i ON i.id = e.category_id
LEFT JOIN public.cities ci ON ci.id = e.city_id;

ALTER VIEW public.events_with_counts SET (security_invoker = true);
