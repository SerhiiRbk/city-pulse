-- ============================================================
-- 070: Add what_to_expect and icebreaker fields to events
--
-- what_to_expect: Short text explaining what newcomers can expect
--   (meeting point, format, vibe). Shown on event detail page.
--
-- icebreaker: Optional conversation starter question shown in
--   crew chats and on the event page to help people break the ice.
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS what_to_expect text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icebreaker text DEFAULT NULL;

COMMENT ON COLUMN public.events.what_to_expect IS
  'Short text for newcomers: what to expect, where to meet, what the format is. Max ~500 chars.';

COMMENT ON COLUMN public.events.icebreaker IS
  'Optional conversation starter question to help attendees break the ice.';

-- Rebuild events_with_counts to expose new columns
DROP VIEW IF EXISTS public.events_with_counts;
CREATE VIEW public.events_with_counts AS
SELECT
  e.id,
  e.title,
  e.description,
  e.description_json,
  e.title_translations,
  e.description_translations,
  e.starts_at,
  e.ends_at,
  e.duration_minutes,
  e.location,
  e.address,
  e.latitude,
  e.longitude,
  e.city,
  e.city_id,
  e.country,
  e.is_online,
  e.is_free,
  e.price,
  e.currency,
  e.max_attendees,
  e.photos,
  e.organizer_id,
  e.category_id,
  e.languages,
  e.is_private,
  e.private_token,
  e.status,
  e.is_system,
  e.is_blocked,
  e.allow_crews,
  e.safety_tags,
  e.what_to_expect,
  e.icebreaker,
  e.parent_system_event_id,
  e.series_id,
  e.series_position,
  e.search_tsv,
  e.created_at,
  e.updated_at,
  -- Organizer join
  p.display_name AS organizer_name,
  p.avatar_url AS organizer_avatar,
  p.is_blocked AS organizer_is_blocked,
  -- Category join
  cat.slug AS category_slug,
  cat.translations AS category_translations,
  -- City join
  ci.name AS city_name,
  ci.translations AS city_translations,
  -- Counts
  COALESCE(gc.going_count, 0)::int AS going_count,
  COALESCE(wc.waitlist_count, 0)::int AS waitlist_count,
  COALESCE(ic.interested_count, 0)::int AS interested_count,
  COALESCE(ac.attended_count, 0)::int AS attended_count,
  COALESCE(nc.no_show_count, 0)::int AS no_show_count,
  -- Reviews
  COALESCE(rc.review_count, 0)::int AS review_count,
  COALESCE(rc.avg_rating, 0)::numeric(3,2) AS avg_rating
FROM public.events e
LEFT JOIN public.profiles p ON p.id = e.organizer_id
LEFT JOIN public.interests cat ON cat.id = e.category_id
LEFT JOIN public.cities ci ON ci.id = e.city_id
LEFT JOIN LATERAL (
  SELECT count(*) AS going_count FROM public.event_attendees WHERE event_id = e.id AND status = 'going'
) gc ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS waitlist_count FROM public.event_attendees WHERE event_id = e.id AND status = 'waitlist'
) wc ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS interested_count FROM public.event_attendees WHERE event_id = e.id AND status = 'interested'
) ic ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS attended_count FROM public.event_attendees WHERE event_id = e.id AND status = 'attended'
) ac ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS no_show_count FROM public.event_attendees WHERE event_id = e.id AND status = 'no_show'
) nc ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS review_count, avg(rating) AS avg_rating FROM public.event_reviews WHERE event_id = e.id
) rc ON true;

ALTER VIEW public.events_with_counts SET (security_invoker = true);
