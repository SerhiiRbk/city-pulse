-- ============================================================
-- 041: Per-user calendar subscription token
--
-- Why: we want users to subscribe to their personal event feed in
-- Google Calendar / Apple Calendar / Outlook. Subscribed feeds are
-- fetched without any session cookies, so the URL itself must carry an
-- unguessable secret. Putting a per-user `calendar_token` on the
-- profile lets `/api/calendar/me/ical?token=...` authenticate the
-- request without OAuth.
--
-- Notes:
--   * Nullable + lazily populated by a server action — old profiles
--     don't need a backfill migration.
--   * Unique partial index gives constant-time lookup while still
--     allowing many `null` rows.
--   * Token is rotateable: the server action regenerates and the old
--     URL stops resolving immediately.
-- ============================================================

alter table public.profiles
  add column if not exists calendar_token text;

create unique index if not exists idx_profiles_calendar_token
  on public.profiles (calendar_token)
  where calendar_token is not null;
