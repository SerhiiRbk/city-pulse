-- ============================================================
-- 068: Add new safety tags: dog_friendly, kid_friendly, outdoor, healthy_lifestyle
-- ============================================================

-- Drop and recreate the constraint with the expanded vocabulary
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_safety_tags_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_safety_tags_check
  CHECK (
    safety_tags <@ array[
      'women_only',
      'adults_only',
      'lgbtq_friendly',
      'sober',
      'beginner_friendly',
      'dog_friendly',
      'kid_friendly',
      'outdoor',
      'healthy_lifestyle'
    ]::text[]
  );
