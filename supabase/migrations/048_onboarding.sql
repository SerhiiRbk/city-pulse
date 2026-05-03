-- ============================================================
-- City-Pulse: Onboarding tracking
-- ============================================================
-- A single nullable timestamp on profiles is enough to drive the
-- post-signup wizard:
--   * `null` means the user has never finished the wizard. The
--     middleware redirects them to /onboarding on their next page
--     view (when the `onboarding_wizard` feature flag is on);
--   * a non-null value means we got at minimum a city + 3
--     interests and we should never push them through it again.
--
-- We deliberately don't introduce a separate `user_onboarding`
-- table because the only signal we need is the boolean "have they
-- gone through it"; richer state would invite over-engineering.
-- ============================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the user completed the post-signup onboarding wizard. NULL until they pick city/interests/languages.';

-- A partial index speeds up the middleware lookup
-- ("redirect users with onboarded_at IS NULL"). The vast majority
-- of mature accounts will sit on the non-null side, so a partial
-- index keeps us from indexing everyone.
create index if not exists idx_profiles_onboarded_pending
  on public.profiles (id)
  where onboarded_at is null;
