-- ============================================================
-- City-Pulse: Event Crews — schema & tables
-- ============================================================
-- Lightweight, invite-based group coordination layer for events.
-- Users form private or public crews (2–10 people) attached to
-- any event where they are not the organizer.
--
-- This migration creates:
--   1. event_crews — primary crew entity
--   2. event_crew_members — membership junction
--   3. event_crew_invitations — invitation lifecycle
--   4. event_crew_join_requests — public crew join requests
--   5. event_crew_messages — crew group chat
--   6. user_contacts — user-managed contact list
--   7. allow_crews column on events
--   8. Updated notifications type constraint
--
-- RLS policies, triggers, and feature flag seed are in separate
-- tasks (1.2, 1.3, 1.4).
-- ============================================================

-- ------------------------------------------------------------
-- 1. event_crews
-- ------------------------------------------------------------

create table public.event_crews (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  capacity integer not null check (capacity between 2 and 10),
  languages text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'active' check (status in ('active', 'archived')),
  participant_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint one_host_per_event unique (host_id, event_id)
);

create index idx_event_crews_event
  on public.event_crews (event_id)
  where status = 'active';

create index idx_event_crews_host
  on public.event_crews (host_id)
  where status = 'active';

create index idx_event_crews_archival
  on public.event_crews (event_id, status);

-- ------------------------------------------------------------
-- 2. event_crew_members
-- ------------------------------------------------------------

create table public.event_crew_members (
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index idx_crew_members_user
  on public.event_crew_members (user_id);

create index idx_crew_members_crew_role
  on public.event_crew_members (crew_id, role);

-- ------------------------------------------------------------
-- 3. event_crew_invitations
-- ------------------------------------------------------------

create table public.event_crew_invitations (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  message text check (char_length(message) <= 300),
  message_is_custom boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index idx_crew_invitations_invitee
  on public.event_crew_invitations (invitee_id, status);

create index idx_crew_invitations_crew
  on public.event_crew_invitations (crew_id, status);

-- Prevent duplicate pending invitations for the same user+crew.
create unique index idx_crew_invitations_pending_unique
  on public.event_crew_invitations (crew_id, invitee_id)
  where status = 'pending';

-- ------------------------------------------------------------
-- 4. event_crew_join_requests
-- ------------------------------------------------------------

create table public.event_crew_join_requests (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  message text check (char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.profiles(id)
);

create index idx_crew_join_requests_crew
  on public.event_crew_join_requests (crew_id, status);

-- Prevent duplicate pending requests for the same user+crew.
create unique index idx_crew_join_requests_pending_unique
  on public.event_crew_join_requests (crew_id, requester_id)
  where status = 'pending';

-- ------------------------------------------------------------
-- 5. event_crew_messages
-- ------------------------------------------------------------

create table public.event_crew_messages (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(content) <= 2000),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_crew_messages_crew_time
  on public.event_crew_messages (crew_id, created_at);

create index idx_crew_messages_sender
  on public.event_crew_messages (sender_id);

-- ------------------------------------------------------------
-- 6. user_contacts
-- ------------------------------------------------------------

create table public.user_contacts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  constraint different_users check (owner_id <> contact_id)
);

create index idx_user_contacts_contact
  on public.user_contacts (contact_id);

-- ------------------------------------------------------------
-- 7. events.allow_crews column
-- ------------------------------------------------------------

alter table public.events
  add column allow_crews boolean not null default true;

-- ------------------------------------------------------------
-- 8. Widen notifications type constraint with crew types
-- ------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_comment',
    'new_message', 'chat_request', 'group_new_event', 'system',
    'promoted_from_waitlist',
    'event_cancelled', 'event_recap_reminder', 'event_postponed',
    'rsvp_reconfirm_24h',
    'crew_invitation', 'crew_join_request', 'crew_join_accepted',
    'crew_join_rejected', 'crew_member_joined', 'crew_member_left',
    'crew_deleted'
  ));

-- ------------------------------------------------------------
-- 9. Feature flag seed: event_crews_enabled
-- ------------------------------------------------------------
-- Rollout plan:
--   Phase 1: rollout_pct = 0 + allowlist for internal testing
--   Phase 2: rollout_pct = 10 for early adopters
--   Phase 3: rollout_pct = 100 for GA

insert into public.feature_flags (slug, description, enabled, rollout_pct, allowlist_user_ids)
values (
  'event_crews_enabled',
  'Enable crew creation and management on event pages',
  true,
  0,
  '{}'
)
on conflict (slug) do nothing;

-- ============================================================
-- RLS Policies
-- ============================================================

-- ------------------------------------------------------------
-- Enable RLS on all new tables
-- ------------------------------------------------------------

alter table public.event_crews enable row level security;
alter table public.event_crew_members enable row level security;
alter table public.event_crew_messages enable row level security;
alter table public.event_crew_invitations enable row level security;
alter table public.event_crew_join_requests enable row level security;
alter table public.user_contacts enable row level security;

-- ------------------------------------------------------------
-- event_crews policies
-- ------------------------------------------------------------

-- SELECT: Public crews visible to all authenticated users on the same event;
--         private crews visible only to members.
create policy "event_crews_select"
  on public.event_crews for select
  to authenticated
  using (
    visibility = 'public'
    or exists (
      select 1 from public.event_crew_members m
      where m.crew_id = id and m.user_id = auth.uid()
    )
  );

-- INSERT: Authenticated user, host_id = auth.uid(), event has allow_crews = true or is_system = true.
create policy "event_crews_insert"
  on public.event_crews for insert
  to authenticated
  with check (
    host_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.allow_crews = true or e.is_system = true)
    )
  );

-- UPDATE: Only host (host_id = auth.uid()).
create policy "event_crews_update"
  on public.event_crews for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

-- DELETE: Only host (host_id = auth.uid()) and only when status = 'active'.
create policy "event_crews_delete"
  on public.event_crews for delete
  to authenticated
  using (host_id = auth.uid() and status = 'active');

-- ------------------------------------------------------------
-- event_crew_members policies
-- ------------------------------------------------------------

-- SELECT: Members of the same crew, or anyone if crew is public.
create policy "event_crew_members_select"
  on public.event_crew_members for select
  to authenticated
  using (
    exists (
      select 1 from public.event_crews c
      where c.id = crew_id and c.visibility = 'public'
    )
    or exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id and m.user_id = auth.uid()
    )
  );

-- INSERT: Host or moderator of the crew.
create policy "event_crew_members_insert"
  on public.event_crew_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- DELETE: Self-removal (user_id = auth.uid()) or host removing a member.
create policy "event_crew_members_delete"
  on public.event_crew_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role = 'host'
    )
  );

-- ------------------------------------------------------------
-- event_crew_messages policies
-- ------------------------------------------------------------

-- SELECT: Only crew members.
create policy "event_crew_messages_select"
  on public.event_crew_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id and m.user_id = auth.uid()
    )
  );

-- INSERT: Only crew members where crew status = 'active'.
create policy "event_crew_messages_insert"
  on public.event_crew_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.event_crews c
      where c.id = crew_id and c.status = 'active'
    )
  );

-- ------------------------------------------------------------
-- event_crew_invitations policies
-- ------------------------------------------------------------

-- SELECT: Inviter or invitee.
create policy "event_crew_invitations_select"
  on public.event_crew_invitations for select
  to authenticated
  using (
    inviter_id = auth.uid() or invitee_id = auth.uid()
  );

-- INSERT: Host or moderator of the crew.
create policy "event_crew_invitations_insert"
  on public.event_crew_invitations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- UPDATE: Invitee (to accept/decline).
create policy "event_crew_invitations_update"
  on public.event_crew_invitations for update
  to authenticated
  using (invitee_id = auth.uid())
  with check (invitee_id = auth.uid());

-- ------------------------------------------------------------
-- event_crew_join_requests policies
-- ------------------------------------------------------------

-- SELECT: Requester, or host/moderator of the crew.
create policy "event_crew_join_requests_select"
  on public.event_crew_join_requests for select
  to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- INSERT: Any authenticated user (for public crews).
create policy "event_crew_join_requests_insert"
  on public.event_crew_join_requests for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from public.event_crews c
      where c.id = crew_id and c.visibility = 'public'
    )
  );

-- UPDATE: Host or moderator of the crew (to accept/reject).
create policy "event_crew_join_requests_update"
  on public.event_crew_join_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  )
  with check (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- ------------------------------------------------------------
-- user_contacts policies
-- ------------------------------------------------------------

-- SELECT: owner_id = auth.uid()
create policy "user_contacts_select"
  on public.user_contacts for select
  to authenticated
  using (owner_id = auth.uid());

-- INSERT: owner_id = auth.uid()
create policy "user_contacts_insert"
  on public.user_contacts for insert
  to authenticated
  with check (owner_id = auth.uid());

-- DELETE: owner_id = auth.uid()
create policy "user_contacts_delete"
  on public.user_contacts for delete
  to authenticated
  using (owner_id = auth.uid());


-- ============================================================
-- Triggers and Functions
-- ============================================================

-- ------------------------------------------------------------
-- 9. BEFORE INSERT trigger on event_crew_members:
--    - Enforce one crew per user per event (Req 12.13)
--    - Validate capacity before allowing new member (Req 12.1)
-- ------------------------------------------------------------

create or replace function public.enforce_crew_member_constraints()
returns trigger language plpgsql security definer as $$
declare
  v_event_id uuid;
  v_capacity integer;
  v_participant_count integer;
begin
  -- Get the event_id and capacity for the crew being joined
  select ec.event_id, ec.capacity, ec.participant_count
    into v_event_id, v_capacity, v_participant_count
    from public.event_crews ec
   where ec.id = new.crew_id;

  -- Check: user is not already in another crew for the same event
  if exists (
    select 1
      from public.event_crew_members ecm
      join public.event_crews ec on ec.id = ecm.crew_id
     where ecm.user_id = new.user_id
       and ec.event_id = v_event_id
       and ec.status = 'active'
  ) then
    raise exception 'User is already a member of a crew for this event'
      using errcode = 'P0001';
  end if;

  -- Check: crew has not reached capacity
  if v_participant_count >= v_capacity then
    raise exception 'Crew has reached its maximum capacity'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_crew_member_constraints
  before insert on public.event_crew_members
  for each row execute function public.enforce_crew_member_constraints();

-- ------------------------------------------------------------
-- 10. Event cancellation archival trigger (Req 7.7)
--     When an event is cancelled, archive all its active crews.
-- ------------------------------------------------------------

create or replace function public.archive_crews_on_event_cancel()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.event_crews
       set status = 'archived', archived_at = now(), updated_at = now()
     where event_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger trg_archive_crews_on_cancel
  after update of status on public.events
  for each row execute function public.archive_crews_on_event_cancel();
