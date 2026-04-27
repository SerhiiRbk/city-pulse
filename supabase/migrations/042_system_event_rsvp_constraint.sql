-- ============================================================
-- City-Pulse: RSVP semantics for system events
-- ============================================================
-- System events (is_system = true) are editorial city listings, not
-- community gatherings. They must NEVER carry a hard-commit RSVP signal
-- ('going' / 'waitlist' / 'attended' / 'no_show'); only soft signals
-- ('interested' / 'cancelled') are meaningful, since the platform does
-- not own attendance for those events.
--
-- This migration:
--   1. Backfills any pre-existing 'going' / 'waitlist' rows on system
--      events down to 'interested', preserving the user's intent without
--      polluting going_count.
--   2. Installs a BEFORE trigger on event_attendees that rejects any
--      attempt to set status in ('going','waitlist','attended','no_show')
--      when the parent event is a system event.
-- ============================================================

-- 1. Backfill: demote existing hard commits on system events to 'interested'.
-- Note: event_attendees has no updated_at column (see 003_events_schema.sql),
-- so we only touch `status` here.
update public.event_attendees ea
   set status = 'interested'
  from public.events e
 where ea.event_id = e.id
   and e.is_system = true
   and ea.status in ('going', 'waitlist', 'attended', 'no_show');

-- 2. Trigger function — single source of truth for the constraint.
create or replace function public.check_rsvp_status_for_system()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_system boolean;
begin
  select is_system into v_is_system
    from public.events
   where id = new.event_id;

  if v_is_system is true
     and new.status in ('going', 'waitlist', 'attended', 'no_show') then
    raise exception
      'Status % is not allowed on system events (event_id=%); use ''interested'' or create a meetup instead.',
      new.status, new.event_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_rsvp_status_for_system on public.event_attendees;
create trigger trg_check_rsvp_status_for_system
  before insert or update of status, event_id on public.event_attendees
  for each row execute function public.check_rsvp_status_for_system();

comment on function public.check_rsvp_status_for_system() is
  'Rejects going/waitlist/attended/no_show on system events; community RSVP only.';
