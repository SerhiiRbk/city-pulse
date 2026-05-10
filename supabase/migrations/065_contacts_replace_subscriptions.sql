-- ============================================================
-- City-Pulse: Replace user_subscriptions with user_contacts
-- in profile_stats and profile_reputation views
-- ============================================================
-- This migration rewrites the profile_stats and profile_reputation
-- views to compute follower_count / following_count from the
-- user_contacts table instead of the legacy user_subscriptions table.
--
-- The user_subscriptions table is intentionally NOT dropped —
-- it remains for backward compatibility.
--
-- Rollback: re-run the original view definitions from migrations
-- 009 (profile_stats) and 037 (profile_reputation).
-- ============================================================

-- 1. Add index on owner_id if missing.
--    (contact_id index already exists from migration 059)
CREATE INDEX IF NOT EXISTS idx_user_contacts_owner
  ON public.user_contacts (owner_id);

-- Ensure contact_id index exists (idempotent)
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact
  ON public.user_contacts (contact_id);

-- 2. Rewrite profile_stats view: use user_contacts instead of user_subscriptions
CREATE OR REPLACE VIEW public.profile_stats AS
SELECT
  p.id AS user_id,
  coalesce(ec.created_count, 0) AS events_created,
  coalesce(ea.attended_count, 0) AS events_attended,
  coalesce(er.avg_rating, 0) AS avg_organizer_rating,
  coalesce(er.review_count, 0) AS review_count,
  coalesce(fc.follower_count, 0) AS follower_count,
  coalesce(fg.following_count, 0) AS following_count
FROM public.profiles p
LEFT JOIN (
  SELECT organizer_id, count(*) AS created_count
  FROM public.events WHERE status IN ('published', 'completed')
  GROUP BY organizer_id
) ec ON ec.organizer_id = p.id
LEFT JOIN (
  SELECT user_id, count(*) AS attended_count
  FROM public.event_attendees WHERE status = 'going'
  GROUP BY user_id
) ea ON ea.user_id = p.id
LEFT JOIN (
  SELECT e.organizer_id, avg(r.rating)::numeric(3,2) AS avg_rating, count(*) AS review_count
  FROM public.event_reviews r
  JOIN public.events e ON e.id = r.event_id
  GROUP BY e.organizer_id
) er ON er.organizer_id = p.id
LEFT JOIN (
  SELECT contact_id, count(*) AS follower_count
  FROM public.user_contacts GROUP BY contact_id
) fc ON fc.contact_id = p.id
LEFT JOIN (
  SELECT owner_id, count(*) AS following_count
  FROM public.user_contacts GROUP BY owner_id
) fg ON fg.owner_id = p.id;

-- 3. Rewrite profile_reputation view: replace followers CTE to use user_contacts
DROP VIEW IF EXISTS public.profile_reputation;
CREATE VIEW public.profile_reputation AS
WITH attendance AS (
  SELECT
    user_id,
    count(*) FILTER (WHERE status = 'attended') AS attended_count,
    count(*) FILTER (WHERE status = 'no_show') AS no_show_count,
    count(*) FILTER (WHERE status IN ('going', 'attended')) AS going_and_attended_count
  FROM public.event_attendees
  GROUP BY user_id
),
organized AS (
  SELECT
    organizer_id AS user_id,
    count(*) AS events_organized_count
  FROM public.events
  WHERE status IN ('published', 'completed')
  GROUP BY organizer_id
),
organizer_reviews AS (
  SELECT
    e.organizer_id AS user_id,
    avg(r.rating)::numeric(3,2) AS avg_organizer_rating,
    count(*) AS organizer_review_count
  FROM public.event_reviews r
  JOIN public.events e ON e.id = r.event_id
  GROUP BY e.organizer_id
),
followers AS (
  SELECT
    contact_id AS user_id,
    count(*) AS follower_count
  FROM public.user_contacts
  GROUP BY contact_id
),
categories AS (
  SELECT
    ea.user_id,
    count(DISTINCT e.category_id) AS attended_category_count
  FROM public.event_attendees ea
  JOIN public.events e ON e.id = ea.event_id
  WHERE ea.status = 'attended'
    AND e.category_id IS NOT NULL
  GROUP BY ea.user_id
)
SELECT
  p.id AS user_id,
  coalesce(a.attended_count, 0) AS attended_count,
  coalesce(a.no_show_count, 0) AS no_show_count,
  coalesce(a.going_and_attended_count, 0) AS going_and_attended_count,
  coalesce(o.events_organized_count, 0) AS events_organized_count,
  coalesce(orv.avg_organizer_rating, 0) AS avg_organizer_rating,
  coalesce(orv.organizer_review_count, 0) AS organizer_review_count,
  coalesce(f.follower_count, 0) AS follower_count,
  coalesce(c.attended_category_count, 0) AS attended_category_count,
  CASE
    WHEN coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) = 0 THEN NULL
    ELSE round(
      (a.attended_count::numeric
        / nullif(a.attended_count + a.no_show_count, 0)) * 100
    , 2)
  END AS attendance_rate,
  CASE
    WHEN coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) = 0 THEN 0
    ELSE greatest(0, least(100, round(
      (a.attended_count::numeric
        / nullif(a.attended_count + a.no_show_count, 0)) * 70
      + least(a.attended_count::numeric / 10, 1) * 30
    )::int))
  END AS reliability_score,
  CASE
    WHEN coalesce(a.attended_count, 0) < 3 THEN 'newcomer'
    WHEN coalesce(a.attended_count, 0) >= 10
      AND coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) > 0
      AND (a.attended_count::numeric
            / nullif(a.attended_count + a.no_show_count, 0)) * 70
          + least(a.attended_count::numeric / 10, 1) * 30 >= 80
      THEN 'elite'
    WHEN coalesce(a.attended_count, 0) + coalesce(a.no_show_count, 0) > 0
      AND (a.attended_count::numeric
            / nullif(a.attended_count + a.no_show_count, 0)) * 70
          + least(a.attended_count::numeric / 10, 1) * 30 >= 50
      THEN 'trusted'
    ELSE 'regular'
  END AS tier
FROM public.profiles p
LEFT JOIN attendance a ON a.user_id = p.id
LEFT JOIN organized o ON o.user_id = p.id
LEFT JOIN organizer_reviews orv ON orv.user_id = p.id
LEFT JOIN followers f ON f.user_id = p.id
LEFT JOIN categories c ON c.user_id = p.id;

ALTER VIEW public.profile_reputation SET (security_invoker = true);

-- 4. Update the badge trigger to fire on user_contacts changes
--    (replaces the old trigger on user_subscriptions for follower_count)
CREATE OR REPLACE FUNCTION public.trg_award_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_profile_badges(coalesce(NEW.contact_id, OLD.contact_id));
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_user_contacts_award ON public.user_contacts;
CREATE TRIGGER trg_user_contacts_award
  AFTER INSERT OR DELETE ON public.user_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_award_on_contact();
