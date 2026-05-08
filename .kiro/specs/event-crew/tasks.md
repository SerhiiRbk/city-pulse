# Implementation Plan: Event Crew

## Overview

This plan implements the Event Crew feature — a lightweight, invite-based group coordination layer for events. Implementation proceeds bottom-up: database schema and RLS first, then server actions, then UI components and pages, and finally integration wiring and the cron job.

## Tasks

- [x] 1. Database migration and schema setup
  - [x] 1.1 Create migration file `supabase/migrations/059_event_crews.sql` with all new tables
    - Create `event_crews` table with all columns, constraints, and indexes
    - Create `event_crew_members` table with composite PK and indexes
    - Create `event_crew_invitations` table with partial unique index
    - Create `event_crew_join_requests` table with partial unique index
    - Create `event_crew_messages` table with time-based index
    - Create `user_contacts` table with self-reference constraint
    - Add `allow_crews boolean not null default true` column to `events` table
    - Update `notifications` type check constraint with new crew notification types
    - _Requirements: 1.1–1.10, 5.1, 10.1, 11.1–11.6_

  - [x] 1.2 Add RLS policies to the migration
    - Enable RLS on all new tables
    - Add SELECT/INSERT/UPDATE/DELETE policies for `event_crews` (public vs private visibility, host-only mutations)
    - Add SELECT/INSERT/DELETE policies for `event_crew_members` (member visibility, host/moderator insert, self-removal)
    - Add SELECT/INSERT policies for `event_crew_messages` (members only, active crews only)
    - Add SELECT/INSERT/UPDATE policies for `event_crew_invitations` (inviter/invitee visibility, host/moderator insert, invitee update)
    - Add SELECT/INSERT/UPDATE policies for `event_crew_join_requests` (requester/host/moderator visibility)
    - Add SELECT/INSERT/DELETE policies for `user_contacts` (owner only)
    - _Requirements: 2.1–2.8, 4.1, 5.3, 12.10_

  - [x] 1.3 Add triggers and functions to the migration
    - Create `BEFORE INSERT` trigger on `event_crew_members` to enforce one-crew-per-user-per-event
    - Create `archive_crews_on_event_cancel()` function and trigger on `events.status` update
    - Create trigger to validate capacity before inserting into `event_crew_members`
    - _Requirements: 7.7, 12.1, 12.13_

  - [x] 1.4 Add feature flag seed to the migration
    - Insert `event_crews_enabled` into `feature_flags` table with `enabled = true`, `rollout_pct = 0`, empty allowlist
    - _Requirements: 9.1–9.4_

- [x] 2. TypeScript types and shared utilities
  - [x] 2.1 Add crew-related types to `src/types/database.ts`
    - Add TypeScript interfaces for `EventCrew`, `EventCrewMember`, `EventCrewInvitation`, `EventCrewJoinRequest`, `EventCrewMessage`, `UserContact`
    - Add type for crew roles: `'host' | 'moderator' | 'member'`
    - Add type for crew visibility: `'public' | 'private'`
    - Add type for crew status: `'active' | 'archived'`
    - Add types for invitation/request statuses
    - _Requirements: 1.1–1.10, 2.1_

  - [x] 2.2 Create crew validation constants in `src/lib/constants/crew.ts`
    - Define `CREW_NAME_MIN_LENGTH = 3`, `CREW_NAME_MAX_LENGTH = 120`
    - Define `CREW_DESCRIPTION_MAX_LENGTH = 2000`
    - Define `CREW_CAPACITY_MIN = 2`, `CREW_CAPACITY_MAX = 10`
    - Define `CREW_MESSAGE_MAX_LENGTH = 2000`
    - Define `CREW_INVITATION_MESSAGE_MAX_LENGTH = 300`
    - Define `MAX_INVITATIONS_PER_CREW = 20`
    - Define `MAX_ACTIVE_CREWS_PER_USER = 10`
    - _Requirements: 1.3, 1.5, 1.6, 3.5, 4.6, 12.5, 12.6_

- [x] 3. Server actions — Core CRUD
  - [x] 3.1 Implement `createCrew` server action in `src/lib/actions/crew.ts`
    - Validate auth, event allows crews, user is not organizer, user has no crew for this event, active crew limit not exceeded
    - Insert into `event_crews` with host_id = current user
    - Insert into `event_crew_members` with role = 'host'
    - Insert system message into `event_crew_messages` ("Crew created")
    - Apply default name "Компания на {event_name}" if no custom name provided
    - Return crew object or error
    - _Requirements: 1.1–1.10, 12.3, 12.5, 12.11, 12.12_

  - [x] 3.2 Implement `updateCrew` server action
    - Validate auth, user is host
    - Update allowed fields: name, description, capacity, visibility
    - Insert system message on description change
    - _Requirements: 2.6, 4.10, 5.8_

  - [x] 3.3 Implement `deleteCrew` server action
    - Validate auth, user is host, crew is active
    - Delete crew (cascades members, messages, invitations, requests)
    - Send notifications to all former participants (type = 'crew_deleted')
    - _Requirements: 2.6, 8.5, 8.6_

  - [x] 3.4 Implement `leaveCrew` server action
    - Validate auth, user is member of crew
    - If user is host with moderators: promote longest-standing moderator to host
    - If user is host without moderators: delete crew, notify all
    - If user is member/moderator: remove from members, decrement participant_count
    - Insert system message on departure
    - _Requirements: 8.1–8.4, 8.7_

  - [x] 3.5 Implement `removeMember` server action
    - Validate auth, user is host
    - Remove target from `event_crew_members`
    - Decrement `participant_count`
    - Insert system message and notify removed user
    - _Requirements: 2.5, 8.7_

- [x] 4. Server actions — Roles
  - [x] 4.1 Implement `promoteModerator` and `demoteModerator` server actions
    - Validate auth, user is host
    - Update member role to 'moderator' or back to 'member'
    - _Requirements: 2.2–2.4_

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Server actions — Invitations
  - [x] 6.1 Implement `sendCrewInvitation` server action
    - Validate: auth, user is host/moderator, crew not full, invitee not blocked, invitee not already in a crew for this event, no duplicate pending invitation, max 20 invitations not exceeded
    - Insert into `event_crew_invitations`
    - Create notification (type = 'crew_invitation')
    - Handle custom vs default message text (message_is_custom flag)
    - _Requirements: 3.1–3.5, 3.8–3.12, 12.6–12.9_

  - [x] 6.2 Implement `respondToInvitation` server action
    - Validate: auth, user is invitee, invitation is pending, crew not full (on accept)
    - On accept: add to members, increment participant_count, cancel other pending invitations/requests for same event, insert system message, notify crew members
    - On decline: mark as declined
    - _Requirements: 3.6, 3.7, 3.11, 12.14_

  - [x] 6.3 Implement `getMyPendingInvitations` server action
    - Return all pending invitations for current user with crew and event details
    - _Requirements: 11.1_

- [x] 7. Server actions — Join Requests
  - [x] 7.1 Implement `submitJoinRequest` server action
    - Validate: auth, crew is public, crew not full, user not already in a crew for this event, no duplicate pending request
    - Insert into `event_crew_join_requests`
    - Notify host and moderators (type = 'crew_join_request')
    - _Requirements: 4.5, 4.6, 12.13, 12.15_

  - [x] 7.2 Implement `respondToJoinRequest` server action
    - Validate: auth, user is host/moderator, request is pending, crew not full (on accept)
    - On accept: add to members, increment participant_count, cancel other pending requests for same event, insert system message, notify requester and crew members
    - On reject: mark as rejected, notify requester
    - _Requirements: 4.7, 4.8, 12.14_

  - [x] 7.3 Implement `getJoinRequestsForCrew` server action
    - Validate: auth, user is host/moderator
    - Return pending requests with requester profile info
    - _Requirements: 2.8_

- [x] 8. Server actions — Chat
  - [x] 8.1 Implement `sendCrewMessage` server action
    - Validate: auth, user is crew member, crew is active, content within 2000 chars
    - Insert into `event_crew_messages`
    - Return message object
    - _Requirements: 5.3, 5.4, 12.10_

  - [x] 8.2 Implement `getCrewMessages` server action
    - Validate: auth, user is crew member
    - Cursor-based pagination on (created_at, id), newest first
    - Return messages with sender profile info and nextCursor
    - _Requirements: 5.2, 5.3_

- [x] 9. Server actions — Contacts
  - [x] 9.1 Implement `addContact`, `removeContact`, `getContacts` server actions
    - `addContact`: validate interaction pool membership, insert into `user_contacts`
    - `removeContact`: validate ownership, delete from `user_contacts`
    - `getContacts`: return contacts with display_name, avatar, optional search filter
    - _Requirements: 10.1, 10.2_

  - [x] 9.2 Implement `getInteractionPool` server action
    - Query users sharing: same crew membership, approved chat conversation, or mutual "going" RSVP
    - Support search filter on display_name
    - Support optional event_id filter
    - Paginate with LIMIT
    - _Requirements: 10.2, 10.4, 10.5_

- [x] 10. Server actions — Queries
  - [x] 10.1 Implement `getCrewsForEvent` server action
    - Return public crews with details (name, languages, spots)
    - Return aggregate crew count
    - Return current user's crew ID if they're in one
    - _Requirements: 4.2, 4.3, 6.1–6.4_

  - [x] 10.2 Implement `getCrewDetails` server action
    - Validate: auth, user is crew member
    - Return full crew data with members, pending invitations (for host/moderator), pending requests (for host/moderator)
    - _Requirements: 5.2_

  - [x] 10.3 Implement `getMyCrews` server action
    - Return user's crews (active and archived) with event info
    - Support status filter
    - _Requirements: 7.3_

- [x] 11. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. i18n messages
  - [x] 12.1 Add crew-related i18n keys to all locale files (`src/messages/en.json`, `ru.json`, `uk.json`, `cs.json`, `de.json`)
    - Add `crew` namespace with keys: invitation_default, join_request_accepted, join_request_rejected, crew_created, member_joined, member_left, host_updated_description, crew_deleted, crew_full, create_crew_button, request_to_join, etc.
    - Add "Пойти вместе" block text and FAQ description in all languages
    - _Requirements: 3.2, 3.3, 6.5, 6.6_

- [x] 13. UI Components — Crew creation and cards
  - [x] 13.1 Create `CrewCreateDialog` component in `src/components/crew/CrewCreateDialog.tsx`
    - Modal form with: name input (with default placeholder), description textarea, capacity slider (2–10), language picker, visibility toggle (public/private)
    - Contact multiselect for initial invitations using `ContactsPicker`
    - Submit calls `createCrew` + `sendCrewInvitation` for each selected contact
    - Redirect to crew detail page on success
    - _Requirements: 1.1–1.10, 3.9_

  - [x] 13.2 Create `CrewCard` component in `src/components/crew/CrewCard.tsx`
    - Display: crew name, supported languages, available spots (e.g., "4/6 spots")
    - Show "Request to join" button for public crews (hidden when full)
    - Show "Full" badge when at capacity
    - _Requirements: 4.3, 4.4, 4.9, 6.2, 6.4_

  - [x] 13.3 Create `CrewEventBlock` component in `src/components/crew/CrewEventBlock.tsx`
    - "Пойти вместе" section with explanatory text
    - "Create a Crew" button (hidden for organizer or when allow_crews is disabled)
    - List of public `CrewCard` components
    - Aggregate crew count display (e.g., "10 going · 2 crews")
    - _Requirements: 1.1, 1.2, 6.1–6.5, 9.3_

- [x] 14. UI Components — Crew management
  - [x] 14.1 Create `CrewPanel` component in `src/components/crew/CrewPanel.tsx`
    - Full crew management view: crew info, settings (for host), invite button
    - Display pending invitations and join requests (for host/moderator)
    - Member list with role badges and actions (promote/demote/remove for host)
    - Leave/Delete crew actions
    - _Requirements: 2.1–2.8, 8.1–8.7_

  - [x] 14.2 Create `CrewChat` component in `src/components/crew/CrewChat.tsx`
    - Real-time chat UI with message input (disabled when archived)
    - Subscribe to `event_crew_messages` via Supabase Realtime
    - Cursor-based pagination for loading older messages
    - System messages visually distinguished from user messages
    - _Requirements: 5.1–5.9_

  - [x] 14.3 Create `CrewMemberList` component in `src/components/crew/CrewMemberList.tsx`
    - Avatar stack with role indicators (host crown, moderator badge)
    - Action menu per member (for host): promote, demote, remove
    - _Requirements: 2.1–2.5_

  - [x] 14.4 Create `CrewInvitationCard` and `CrewJoinRequestCard` components
    - `CrewInvitationCard`: notification card with crew info, invitation message, accept/decline buttons
    - `CrewJoinRequestCard`: requester info, message, accept/reject buttons (for host/moderator)
    - _Requirements: 3.6, 3.7, 4.7, 4.8_

- [x] 15. UI Components — Contacts
  - [x] 15.1 Create `ContactsPicker` component in `src/components/crew/ContactsPicker.tsx`
    - Multiselect from user's contacts
    - Search interaction pool for users not yet in contacts
    - Display avatar + display_name for each option
    - _Requirements: 3.9, 10.3, 10.4_

  - [x] 15.2 Create `ContactsList` component in `src/components/crew/ContactsList.tsx`
    - List of contacts with avatar, name, remove button
    - Search/filter functionality
    - "Add from interaction pool" action
    - _Requirements: 10.1, 10.2_

- [x] 16. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Page routes and integration
  - [x] 17.1 Create crew detail page at `src/app/[locale]/events/[id]/crew/[crewId]/page.tsx`
    - Render `CrewPanel` and `CrewChat` components
    - Fetch crew details via `getCrewDetails`
    - Subscribe to membership changes via Supabase Realtime
    - Handle archived state (read-only chat, no actions)
    - _Requirements: 5.1–5.9, 7.2, 7.3_

  - [x] 17.2 Create profile crews page at `src/app/[locale]/profile/crews/page.tsx`
    - List user's active and archived crews via `getMyCrews`
    - Link to crew detail pages
    - _Requirements: 7.3_

  - [x] 17.3 Create profile contacts page at `src/app/[locale]/profile/contacts/page.tsx`
    - Render `ContactsList` component
    - _Requirements: 10.1–10.5_

  - [x] 17.4 Integrate `CrewEventBlock` into existing event detail page
    - Add crew section to `src/app/[locale]/events/[id]/page.tsx`
    - Gate behind `event_crews_enabled` feature flag
    - Show/hide based on `allow_crews` flag and user role (organizer vs attendee)
    - _Requirements: 1.1, 1.2, 6.1–6.5, 9.1–9.4_

  - [x] 17.5 Add `allow_crews` toggle to event creation/edit form
    - Add toggle to the existing event form component
    - Hidden for system events (always enabled)
    - Default to `true` for community events
    - _Requirements: 9.1–9.4_

  - [x] 17.6 Integrate crew notifications into notification dropdown
    - Handle new notification types: crew_invitation, crew_join_request, crew_join_accepted, crew_join_rejected, crew_member_joined, crew_member_left, crew_deleted
    - Add appropriate icons and action links
    - _Requirements: 11.1–11.6_

  - [x] 17.7 Add "Crews" and "Contacts" navigation items to profile sidebar
    - Link to `/profile/crews` and `/profile/contacts`
    - _Requirements: 7.3, 10.1_

- [x] 18. Cron job — Crew archival
  - [x] 18.1 Create cron endpoint at `src/app/api/cron/crew-archive/route.ts`
    - Query active crews where event ended more than 14 days ago
    - Batch update (500 per run): set status = 'archived', archived_at = now()
    - Return count of archived crews
    - Follow existing cron pattern (auth via cron secret header)
    - _Requirements: 7.1, 7.4–7.6_

- [x] 19. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan — all tasks are core implementation)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The feature is gated behind the `event_crews_enabled` feature flag for gradual rollout
- Real-time subscriptions (chat + membership) use Supabase Realtime filtered channels
- The migration is a single file (059) to ensure atomic schema changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "9.1", "9.2"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3", "14.4"] },
    { "id": 11, "tasks": ["15.1", "15.2"] },
    { "id": 12, "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5", "17.6", "17.7"] },
    { "id": 13, "tasks": ["18.1"] }
  ]
}
```
