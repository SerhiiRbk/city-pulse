-- ============================================================
-- City-Pulse: RSVP re-confirm reminder + auto-release pipeline
-- ============================================================
-- A common failure mode for capacity-constrained events is that
-- some 'going' attendees silently no-show, blocking the waitlist
-- behind them. We solve this with a 24h reconfirm loop:
--
--   1. ~24h before start, a cron asks every 'going' attendee to
--      reconfirm. We track when the prompt was sent so the cron
--      stays idempotent across runs.
--
--   2. Attendees confirm via the existing event detail UI; the
--      action flips `confirmed = true, confirmed_at = now()` (the
--      legacy columns from migration 003 are repurposed here).
--
--   3. A second cron pass (a few hours later) auto-cancels any
--      'going' attendee that did not confirm in time, freeing the
--      slot. The existing AFTER trigger from migration 035 will
--      promote the next waitlist entry automatically.
--
-- Migration content:
--   * `event_attendees.reconfirm_sent_at` — when we asked for
--     reconfirmation. NULL means we have not asked yet.
--   * notification type `rsvp_reconfirm_24h` added to the type
--     check, plus an index for the existence-check query the cron
--     uses on every tick.
-- ============================================================

alter table public.event_attendees
  add column if not exists reconfirm_sent_at timestamptz;

comment on column public.event_attendees.reconfirm_sent_at is
  'Timestamp when the 24h re-confirm prompt was last issued. Cron filters on this column to stay idempotent. NULL = never asked.';

-- Compound index used by the cron to find rows that haven't been
-- pinged yet. Partial because only 'going' rows ever need the
-- 24h prompt.
create index if not exists idx_event_attendees_reconfirm_pending
  on public.event_attendees (event_id, reconfirm_sent_at)
  where status = 'going';

-- Widen notification type vocabulary.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_comment',
    'new_message', 'chat_request', 'group_new_event', 'system',
    'promoted_from_waitlist',
    'event_cancelled', 'event_recap_reminder', 'event_postponed',
    'rsvp_reconfirm_24h'
  ));

-- Extend the existing partial index to cover the new type so the
-- "did we already ping this user?" lookup stays O(log n).
drop index if exists public.idx_notifications_user_type_event;
create index if not exists idx_notifications_user_type_event
  on public.notifications (user_id, type, ((data->>'event_id')))
  where type in (
    'event_reminder_24h', 'event_reminder_2h', 'event_recap_reminder',
    'event_cancelled', 'event_postponed', 'rsvp_reconfirm_24h'
  );
