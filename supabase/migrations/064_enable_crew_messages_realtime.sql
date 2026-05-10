-- ============================================================
-- Enable Supabase Realtime for event_crew_messages
-- ============================================================
-- The crew chat uses postgres_changes subscription which requires
-- the table to be in the supabase_realtime publication.
-- Also fix the SELECT policy to use the security definer helper
-- to avoid potential recursion issues with realtime.

-- 1. Add table to the Supabase Realtime publication
alter publication supabase_realtime add table public.event_crew_messages;

-- 2. Fix SELECT policy to use security definer function (avoids recursion)
drop policy if exists "event_crew_messages_select" on public.event_crew_messages;

create policy "event_crew_messages_select"
  on public.event_crew_messages for select
  to authenticated
  using (
    public.is_crew_member(crew_id, auth.uid())
  );

-- 3. Fix INSERT policy similarly
drop policy if exists "event_crew_messages_insert" on public.event_crew_messages;

create policy "event_crew_messages_insert"
  on public.event_crew_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_crew_member(crew_id, auth.uid())
  );
