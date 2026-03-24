-- Add new_comment type and restore notification insert policy
-- so server actions can create notifications via the regular authenticated client

-- Widen the type constraint to include new_comment
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_comment',
    'new_message', 'chat_request', 'group_new_event', 'system'
  ));

-- Allow authenticated users to insert notifications for any user
-- (needed for comment/reply notifications created by server actions)
create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');
