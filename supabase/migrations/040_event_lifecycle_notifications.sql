-- ============================================================
-- 040: Widen notification types for event lifecycle + index for crons
--
-- Why: we now drive lifecycle UX from server-side jobs and actions:
--   * `event_cancelled` — sent to RSVPs when organiser cancels.
--   * `event_recap_reminder` — sent to organiser after event ends
--      without a recap post.
--   * `event_postponed` — sent to RSVPs when starts_at changes
--      (reserved; currently unused but we want the type ready).
--
-- The `notifications` table has a tight CHECK constraint on `type`.
-- Drop+recreate the constraint additively, preserving every previously
-- accepted value (see migrations 006, 031, 035) so historical rows stay
-- valid.
--
-- Also: the reminder cron checks "did we already notify (user, event,
-- type)?" on every run. A partial index over the lifecycle types keeps
-- those existence checks O(log n) regardless of total notification volume.
-- ============================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_comment',
    'new_message', 'chat_request', 'group_new_event', 'system',
    'promoted_from_waitlist',
    'event_cancelled', 'event_recap_reminder', 'event_postponed'
  ));

create index if not exists idx_notifications_user_type_event
  on public.notifications (user_id, type, ((data->>'event_id')))
  where type in (
    'event_reminder_24h', 'event_reminder_2h', 'event_recap_reminder',
    'event_cancelled', 'event_postponed'
  );
