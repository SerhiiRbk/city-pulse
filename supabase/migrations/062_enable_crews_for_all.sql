-- ============================================================
-- Enable event_crews_enabled feature flag for all users (GA)
-- ============================================================
-- Previously rollout_pct was 0 (internal testing only).
-- This sets it to 100 so all users can create and join crews.

update public.feature_flags
set rollout_pct = 100
where slug = 'event_crews_enabled';
