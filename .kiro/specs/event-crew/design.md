# Technical Design: Event Crew

## Overview

Event Crew replaces the existing meetup system (`parent_system_event_id`-based child events) with a lightweight, invite-based group coordination layer. Instead of creating separate events, users form private or public crews (2–10 people) attached to any event where they are not the organizer.

The design leverages existing infrastructure: Supabase PostgreSQL for data, RLS for access control, Supabase Realtime for crew chat, the existing notification system for delivery, and Next.js server actions for the API layer.

---

## 1. Database Schema

### 1.1 New Tables

#### `event_crews`

Primary entity representing a crew attached to an event.

```sql
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
```

**Indexes:**
- `idx_event_crews_event` on `(event_id)` where `status = 'active'`
- `idx_event_crews_host` on `(host_id)` where `status = 'active'`
- `idx_event_crews_archival` on `(event_id, status)` for the archival cron

#### `event_crew_members`

Membership junction table with role tracking.

```sql
create table public.event_crew_members (
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
```

**Indexes:**
- `idx_crew_members_user` on `(user_id)` — fast lookup "which crews am I in?"
- `idx_crew_members_crew_role` on `(crew_id, role)` — fast role-based queries

**Constraint trigger:** Enforce one crew per user per event:
```sql
create unique index idx_one_crew_per_user_per_event
  on public.event_crew_members (user_id, (select event_id from public.event_crews where id = crew_id));
```
> Implementation note: Since computed unique indexes aren't directly supported, this will be enforced via a `BEFORE INSERT` trigger that checks `event_crew_members` joined with `event_crews` for the same `event_id`.

#### `event_crew_invitations`

Tracks invitation lifecycle.

```sql
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
```

**Indexes:**
- `idx_crew_invitations_invitee` on `(invitee_id, status)` — "my pending invitations"
- `idx_crew_invitations_crew` on `(crew_id, status)` — "invitations for this crew"
- Partial unique: `unique (crew_id, invitee_id) where status = 'pending'` — prevent duplicate pending invitations

#### `event_crew_join_requests`

For public crews — users request to join.

```sql
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
```

**Indexes:**
- `idx_crew_join_requests_crew` on `(crew_id, status)`
- Partial unique: `unique (crew_id, requester_id) where status = 'pending'`

#### `event_crew_messages`

Chat messages for crew group chat.

```sql
create table public.event_crew_messages (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(content) <= 2000),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
```

**Indexes:**
- `idx_crew_messages_crew_time` on `(crew_id, created_at)` — paginated chat loading
- `idx_crew_messages_sender` on `(sender_id)` — user message history

#### `user_contacts`

User-managed contact list.

```sql
create table public.user_contacts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  constraint different_users check (owner_id <> contact_id)
);
```

**Indexes:**
- `idx_user_contacts_contact` on `(contact_id)` — reverse lookup

### 1.2 Schema Changes to Existing Tables

#### `events` table — new column

```sql
alter table public.events
  add column allow_crews boolean not null default true;
```

- For `is_system = true` events: always treated as `true` regardless of stored value (enforced in application layer).
- For community events: organizer toggles this in the event creation/edit form.

#### `notifications` table — new types

Add to the `type` check constraint:
```sql
alter table public.notifications
  drop constraint notifications_type_check,
  add constraint notifications_type_check check (type in (
    'new_event', 'event_reminder_24h', 'event_reminder_2h',
    'spots_almost_full', 'comment_reply', 'new_message',
    'chat_request', 'group_new_event', 'system',
    'crew_invitation', 'crew_join_request', 'crew_join_accepted',
    'crew_join_rejected', 'crew_member_joined', 'crew_member_left',
    'crew_deleted'
  ));
```

### 1.3 Row-Level Security Policies

#### `event_crews`

| Operation | Policy |
|-----------|--------|
| SELECT | Public crews visible to all authenticated users on the same event; private crews visible only to members |
| INSERT | Authenticated user, `host_id = auth.uid()`, event has `allow_crews = true` or `is_system = true` |
| UPDATE | Only host (`host_id = auth.uid()`) |
| DELETE | Only host (`host_id = auth.uid()`) and only when `status = 'active'` |

#### `event_crew_members`

| Operation | Policy |
|-----------|--------|
| SELECT | Members of the same crew, or anyone if crew is public |
| INSERT | Host or moderator of the crew (via subquery) |
| DELETE | Self-removal (`user_id = auth.uid()`) or host removing a member |

#### `event_crew_messages`

| Operation | Policy |
|-----------|--------|
| SELECT | Only crew members |
| INSERT | Only crew members where crew `status = 'active'` |

#### `event_crew_invitations`

| Operation | Policy |
|-----------|--------|
| SELECT | Inviter or invitee |
| INSERT | Host or moderator of the crew |
| UPDATE | Invitee (to accept/decline) |

#### `event_crew_join_requests`

| Operation | Policy |
|-----------|--------|
| SELECT | Requester, or host/moderator of the crew |
| INSERT | Any authenticated user (for public crews) |
| UPDATE | Host or moderator of the crew (to accept/reject) |

#### `user_contacts`

| Operation | Policy |
|-----------|--------|
| SELECT | `owner_id = auth.uid()` |
| INSERT | `owner_id = auth.uid()` |
| DELETE | `owner_id = auth.uid()` |

---

## 2. API Layer (Server Actions)

All server actions live in `src/lib/actions/crew.ts` following the existing pattern.

### 2.1 Core CRUD

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `createCrew` | `{ event_id, name?, description?, capacity, languages[], visibility }` | `{ crew, error? }` | Validates: not organizer, event allows crews, user has no crew for this event, active crew limit not exceeded |
| `updateCrew` | `{ crew_id, name?, description?, capacity?, visibility? }` | `{ success, error? }` | Host only |
| `deleteCrew` | `{ crew_id }` | `{ success, error? }` | Host only, active crews only |
| `leaveCrew` | `{ crew_id }` | `{ success, error? }` | Any member; triggers host succession or deletion |
| `removeMember` | `{ crew_id, user_id }` | `{ success, error? }` | Host only |

### 2.2 Roles

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `promoteModerator` | `{ crew_id, user_id }` | `{ success, error? }` | Host only |
| `demoteModerator` | `{ crew_id, user_id }` | `{ success, error? }` | Host only |

### 2.3 Invitations

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `sendCrewInvitation` | `{ crew_id, invitee_id, message? }` | `{ invitation, error? }` | Host/moderator; validates capacity, blocks, duplicates, one-crew-per-event |
| `respondToInvitation` | `{ invitation_id, accept: boolean }` | `{ success, error? }` | Invitee only; on accept: add member, cancel other pending invitations for same event |
| `getMyPendingInvitations` | `{}` | `Invitation[]` | For notification badge |

### 2.4 Join Requests (Public Crews)

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `submitJoinRequest` | `{ crew_id, message? }` | `{ request, error? }` | Public crews only; validates capacity, one-crew-per-event |
| `respondToJoinRequest` | `{ request_id, accept: boolean }` | `{ success, error? }` | Host/moderator; on accept: add member, cancel other pending requests |
| `getJoinRequestsForCrew` | `{ crew_id }` | `JoinRequest[]` | Host/moderator |

### 2.5 Chat

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `sendCrewMessage` | `{ crew_id, content }` | `{ message, error? }` | Members only, active crews only |
| `getCrewMessages` | `{ crew_id, cursor?, limit? }` | `{ messages, nextCursor }` | Cursor-based pagination, newest first |

### 2.6 Contacts

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `addContact` | `{ contact_id }` | `{ success, error? }` | Validates interaction pool membership |
| `removeContact` | `{ contact_id }` | `{ success, error? }` | |
| `getContacts` | `{ search? }` | `Contact[]` | With display_name, avatar |
| `getInteractionPool` | `{ search?, event_id? }` | `PoolUser[]` | Users available to add as contacts or invite |

### 2.7 Queries

| Action | Input | Returns | Notes |
|--------|-------|---------|-------|
| `getCrewsForEvent` | `{ event_id }` | `{ publicCrews, crewCount, myCrewId? }` | Public crew details + aggregate count |
| `getCrewDetails` | `{ crew_id }` | `Crew & { members, pendingInvitations?, pendingRequests? }` | Full crew view for members |
| `getMyCrews` | `{ status? }` | `Crew[]` | Profile history view |

---

## 3. Real-time (Supabase Realtime)

### 3.1 Crew Chat Channel

Subscribe to `event_crew_messages` filtered by `crew_id`:

```typescript
supabase
  .channel(`crew-chat:${crewId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'event_crew_messages',
    filter: `crew_id=eq.${crewId}`,
  }, handleNewMessage)
  .subscribe();
```

### 3.2 Crew Membership Changes

Subscribe to `event_crew_members` for live participant count updates:

```typescript
supabase
  .channel(`crew-members:${crewId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'event_crew_members',
    filter: `crew_id=eq.${crewId}`,
  }, handleMemberChange)
  .subscribe();
```

---

## 4. Cron Jobs

### 4.1 Crew Archival — `POST /api/cron/crew-archive`

Runs hourly (same pattern as `mark-completed`).

```
Logic:
1. SELECT event_crews WHERE status = 'active'
   AND event.ends_at + interval '14 days' < now()
2. UPDATE matched crews SET status = 'archived', archived_at = now()
3. Return count of archived crews
```

### 4.2 Event Cancellation Trigger

A database trigger on `events` table:

```sql
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
```

---

## 5. Internationalization (i18n)

### 5.1 Default Invitation Text

Stored as i18n keys, not hardcoded strings:

```json
// en.json
{
  "crew": {
    "invitation_default": "{hostName} invites you to join a crew for {eventTitle}",
    "join_request_accepted": "Your request to join {crewName} was accepted",
    "join_request_rejected": "Your request to join {crewName} was declined",
    ...
  }
}
```

### 5.2 Invitation Delivery Logic

```
IF message_is_custom = true:
  → deliver message as-is (no translation)
ELSE:
  → render i18n key "crew.invitation_default" in RECIPIENT's locale
  → interpolate {hostName} and {eventTitle}
```

The `event_crew_invitations.message` column stores:
- Custom text: the literal user input + `message_is_custom = true`
- Default: `null` + `message_is_custom = false` → rendered at display time in recipient's locale

---

## 6. Component Architecture

### 6.1 New Components (`src/components/crew/`)

| Component | Description |
|-----------|-------------|
| `CrewCreateDialog` | Modal form: name, description, capacity slider, language picker, visibility toggle, contact multiselect |
| `CrewCard` | Public crew card on event page: name, languages, spots, "Request to join" button |
| `CrewPanel` | Full crew management view: members list, role badges, invite button, settings |
| `CrewChat` | Real-time chat UI reusing existing message bubble components |
| `CrewInvitationCard` | Notification card with accept/decline actions |
| `CrewJoinRequestCard` | For host/moderator: requester info + accept/reject |
| `CrewMemberList` | Avatar stack with role indicators |
| `CrewEventBlock` | "Пойти вместе" section on event page with explanatory text |
| `ContactsPicker` | Multiselect from contacts + interaction pool search |
| `ContactsList` | Profile page contacts management |

### 6.2 Page Routes

| Route | Purpose |
|-------|---------|
| `/[locale]/events/[id]` | Existing — add `CrewEventBlock` section |
| `/[locale]/events/[id]/crew/[crewId]` | Crew detail page (chat + members + settings) |
| `/[locale]/profile/crews` | User's crew history (active + archived) |
| `/[locale]/profile/contacts` | Contact list management |

### 6.3 Integration Points

- **Event creation/edit form**: Add `allow_crews` toggle (hidden for system events)
- **Event detail page**: Add crew count to attendee stats, render `CrewEventBlock`
- **Notification dropdown**: Handle new crew notification types with appropriate icons and actions
- **Profile sidebar**: Add "Crews" and "Contacts" navigation items

---

## 7. Data Flow Diagrams

### 7.1 Crew Creation Flow

```
User clicks "Create a Crew" on event page
  → CrewCreateDialog opens
  → User fills form + selects contacts to invite
  → Submit calls createCrew() server action
    → Validates: auth, not organizer, event allows crews, no existing crew for this event
    → INSERT into event_crews (host_id = user)
    → INSERT into event_crew_members (role = 'host')
    → INSERT system message into event_crew_messages ("Crew created")
    → For each invitee: call sendCrewInvitation()
      → INSERT into event_crew_invitations
      → INSERT into notifications (type = 'crew_invitation')
      → Push notification via sendPushToUser()
  → Return crew object
  → Redirect to crew detail page
```

### 7.2 Invitation Accept Flow

```
Invitee clicks "Accept" on notification/invitation card
  → respondToInvitation({ invitation_id, accept: true })
    → Validate: invitation exists, status = 'pending', crew not full
    → UPDATE invitation SET status = 'accepted', responded_at = now()
    → INSERT into event_crew_members (role = 'member')
    → UPDATE event_crews SET participant_count = participant_count + 1
    → INSERT system message "UserName joined the crew"
    → Cancel all other pending invitations for this user + same event
    → Cancel all pending join_requests for this user + same event
    → Notify all crew members (type = 'crew_member_joined')
    → Add user to interaction_pool of all crew members (implicit via membership)
```

### 7.3 Host Departure Flow

```
Host clicks "Leave Crew"
  → leaveCrew({ crew_id })
    → Check: are there moderators?
    → IF moderators exist:
      → Promote longest-standing moderator to host
      → UPDATE event_crews SET host_id = new_host
      → UPDATE event_crew_members SET role = 'host' WHERE user_id = new_host
      → DELETE from event_crew_members WHERE user_id = old_host
      → UPDATE event_crews SET participant_count -= 1
      → System message: "OldHost left. NewHost is now the host."
      → Notify members
    → ELSE (no moderators):
      → DELETE event_crews (cascades: members, messages, invitations, requests)
      → Notify all former members (type = 'crew_deleted')
```

---

## 8. Interaction Pool Query

The interaction pool is computed dynamically (not materialized) to avoid stale data:

```sql
-- Users eligible for contact addition by :current_user_id
SELECT DISTINCT p.id, p.display_name, p.avatar_url
FROM public.profiles p
WHERE p.id <> :current_user_id
  AND p.is_blocked = false
  AND (
    -- Same crew (current or past)
    EXISTS (
      SELECT 1 FROM public.event_crew_members m1
      JOIN public.event_crew_members m2 ON m1.crew_id = m2.crew_id
      WHERE m1.user_id = :current_user_id AND m2.user_id = p.id
    )
    -- Approved chat conversation
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.status = 'active'
        AND ((c.participant_1 = :current_user_id AND c.participant_2 = p.id)
          OR (c.participant_2 = :current_user_id AND c.participant_1 = p.id))
    )
    -- Both "going" on same event
    OR EXISTS (
      SELECT 1 FROM public.event_attendees a1
      JOIN public.event_attendees a2 ON a1.event_id = a2.event_id
      WHERE a1.user_id = :current_user_id AND a2.user_id = p.id
        AND a1.status = 'going' AND a2.status = 'going'
    )
  )
```

For performance, this query is wrapped in a server action with `LIMIT` and optional `search` filter on `display_name`.

---

## 9. Migration Strategy

### 9.1 Migration File: `059_event_crews.sql`

Single migration containing:
1. All new tables with RLS enabled
2. RLS policies
3. Indexes
4. Triggers (one-crew-per-event enforcement, event cancellation archival)
5. `allow_crews` column on `events`
6. Updated notification type constraint

### 9.2 Meetup Deprecation

The existing meetup system (`parent_system_event_id`) is **not removed** in this migration. Instead:
1. Feature flag `event_crews_enabled` gates the new UI
2. Once crews are stable, a follow-up migration removes the meetup UI (the `parent_system_event_id` column stays for historical data)
3. Existing meetups remain as regular community events — they just lose the "child of system event" badge

---

## 10. Feature Flag

```sql
INSERT INTO public.feature_flags (slug, enabled, rollout_pct, allowlist_user_ids)
VALUES ('event_crews_enabled', true, 0, '{}');
```

Rollout plan:
1. `rollout_pct = 0` + allowlist for internal testing
2. `rollout_pct = 10` for early adopters
3. `rollout_pct = 100` for GA

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Spam invitations | Max 20 invitations per crew; blocked users can't be invited |
| Crew bombing | Max 10 active crews per user (configurable) |
| Chat abuse | Standard content moderation via existing report system; crew messages reportable |
| Data leakage | RLS ensures private crew data only visible to members |
| Host impersonation | `host_id` set server-side from `auth.uid()`, never from client input |
| Race conditions on capacity | `participant_count` updated atomically; trigger validates before INSERT into members |

---

## 12. Performance Considerations

| Area | Approach |
|------|----------|
| Event page crew count | Denormalized `participant_count` on `event_crews` avoids COUNT(*) on members |
| Interaction pool query | 3-way UNION with EXISTS subqueries; indexed on all join columns; paginated with LIMIT |
| Chat pagination | Cursor-based (keyset) on `(created_at, id)` — no OFFSET |
| Archival cron | Batched (500 per run), hourly schedule, indexed on `(event_id, status)` |
| Real-time subscriptions | Filtered by `crew_id` — Supabase handles fan-out efficiently for small groups (≤10) |

---

## 13. Testing Strategy

| Layer | Approach |
|-------|----------|
| Database | Migration test: apply migration, verify tables/indexes/triggers exist |
| RLS | Integration tests: verify each policy with different user contexts |
| Server actions | Unit tests with mocked Supabase client; integration tests against local Supabase |
| Components | Component tests with React Testing Library; mock server actions |
| E2E | Playwright: crew creation → invitation → accept → chat → archival flow |
| Cron | Integration test: create crew for past event, run cron, verify archived |
