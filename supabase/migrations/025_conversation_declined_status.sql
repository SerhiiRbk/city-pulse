-- Add explicit declined status for chat requests

alter table public.conversations
  drop constraint if exists conversations_status_check;

alter table public.conversations
  add constraint conversations_status_check
  check (status in ('pending', 'active', 'blocked', 'declined'));
