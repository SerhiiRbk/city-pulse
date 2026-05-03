-- ============================================================
-- City-Pulse: Feature flags
-- ============================================================
-- A tiny, dependency-free flagging layer so we can:
--   * roll out new functionality to a percentage of users
--     (`rollout_pct`, hash-based, deterministic per user_id);
--   * pin specific testers to "always on" (`allowlist_user_ids`);
--   * keep flags off for everyone in production by default.
--
-- We intentionally do NOT integrate LaunchDarkly / Unleash:
--   * the surface is small (a single boolean lookup);
--   * we already have RLS, supabase client, and admin role —
--     nothing else we'd get from a SaaS would justify the
--     dependency at this stage.
-- ============================================================

create table if not exists public.feature_flags (
  -- Slugs are user-typed in the admin UI but never displayed to
  -- end users, so we keep them lower-snake-case for readability
  -- in code references like `isEnabled('weekly_digest', userId)`.
  slug text primary key,
  description text,

  -- 0..100. Percentage of authenticated users for whom the flag
  -- is enabled, computed deterministically from a stable hash of
  -- `user_id || slug`. 0 means off, 100 means on for everyone
  -- (still not anonymous users — see helper below).
  rollout_pct integer not null default 0
    check (rollout_pct >= 0 and rollout_pct <= 100),

  -- Hard "always on" list. Useful for QA accounts, employees, or
  -- single-tenant rollouts. Wins over rollout_pct.
  allowlist_user_ids uuid[] not null default '{}',

  -- Optional kill-switch. When false, the flag is off for
  -- everyone regardless of rollout / allowlist. Lets us disable
  -- a misbehaving feature without losing its config.
  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

-- Read access: any authenticated user may read flag config so the
-- client-side helper can return early without a roundtrip when the
-- flag is globally off. We only expose config, never which user
-- happens to be in the rollout bucket — that's computed per request.
create policy "Anyone can read feature flags"
  on public.feature_flags for select
  using (true);

-- Mutation is admin-only.
create policy "Admins can manage feature flags"
  on public.feature_flags for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create or replace function public.touch_feature_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_feature_flags_touch on public.feature_flags;
create trigger trg_feature_flags_touch
  before update on public.feature_flags
  for each row
  execute function public.touch_feature_flags_updated_at();

-- Seed flags for the rollouts described in the product review.
-- All start disabled (rollout_pct = 0) so deploying the migration
-- never changes behaviour. Admin opt-in unlocks each one when ready.
insert into public.feature_flags (slug, description, rollout_pct) values
  ('onboarding_wizard',     'Force first-run wizard (city + interests + languages) after registration', 0),
  ('friends_going',         'Show "people you follow are going" cue on event cards and detail page',     0),
  ('safety_tags',           'Allow organizers to mark events women-only / 18+ and surface those tags',   0),
  ('rsvp_privacy',          'Allow attendees to RSVP privately (visible to organizer only)',             0),
  ('weekly_digest',         'Send weekly email digest with personalised events',                         0),
  ('web_push',              'Enable web-push subscription prompt and notification fan-out',              0),
  ('recurring_events',      'Allow organizers to schedule recurring event series',                       0),
  ('rsvp_reconfirm',        'Send 24h re-confirm reminder on top of the existing 24h notification',      0),
  ('search_v2',             'Use new full-text search ranking on /events and /groups',                   0)
on conflict (slug) do nothing;
