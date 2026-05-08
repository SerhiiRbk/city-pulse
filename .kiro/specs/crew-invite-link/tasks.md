# Implementation Plan: Crew Invite Link

## Overview

This plan implements shareable invite links for the Event Crew system. The approach is bottom-up: database schema first, then TypeScript types, server actions, integration with existing crew actions, landing page route, UI components, i18n keys, and property-based tests. Each task builds incrementally on the previous ones, ensuring no orphaned code.

## Tasks

- [x] 1. Database migration and TypeScript types
  - [x] 1.1 Create database migration `supabase/migrations/061_crew_invite_links.sql`
    - Create `crew_invite_links` table with columns: id, crew_id, created_by, token, status, use_count, created_at, expires_at, revoked_at
    - Add CHECK constraint for status in ('active', 'revoked', 'expired', 'deactivated')
    - Add CHECK constraint for token length between 32 and 128
    - Create unique index on token for fast lookup
    - Create partial index on (crew_id) WHERE status = 'active' for limit enforcement
    - Create partial index on (created_by, crew_id) WHERE status = 'active' for inviter departure deactivation
    - Create index on (crew_id, created_at DESC) for rate limit checks
    - Create `crew_invite_link_joins` audit table with columns: id, link_id, user_id, joined_at
    - Create indexes on link_id and user_id for the joins table
    - Create `crew_kicked_members` table with columns: crew_id, user_id, kicked_at, kicked_by and composite primary key (crew_id, user_id)
    - Add RLS policies for crew_invite_links (select by host/moderator, select by token for authenticated, insert by host/moderator, update by host or creator)
    - Enable RLS on all three new tables
    - _Requirements: 1.1, 1.2, 1.3, 4.12, 6.1, 6.8_

  - [x] 1.2 Add TypeScript types to `src/types/database.ts`
    - Add `CrewInviteLinkStatus` type: 'active' | 'revoked' | 'expired' | 'deactivated'
    - Add `CrewInviteLink` interface with all columns
    - Add `CrewInviteLinkJoin` interface
    - Add `CrewKickedMember` interface
    - _Requirements: 1.1, 1.2, 4.12_

  - [x] 1.3 Add invite link constants to `src/lib/constants/crew.ts`
    - Add `MAX_ACTIVE_INVITE_LINKS_PER_CREW = 5`
    - Add `INVITE_LINK_EXPIRY_DAYS = 7`
    - Add `INVITE_LINK_TOKEN_BYTES = 36`
    - Add `MAX_INVITE_LINK_GENERATIONS_PER_24H = 10`
    - _Requirements: 1.3, 1.7, 6.2, 6.5, 6.9_

- [x] 2. Core server actions (`src/lib/actions/crew-invite.ts`)
  - [x] 2.1 Implement `generateInviteLink` server action
    - Validate user is authenticated and is host/moderator of the crew
    - Validate crew is active (not archived), not at capacity, event not ended
    - Enforce max 5 active links per crew
    - Enforce max 20 total invitation limit (standard + invite-link joins)
    - Enforce rate limit: max 10 link generations per crew per rolling 24h
    - Generate cryptographically random URL-safe token using `crypto.randomBytes(36).toString('base64url')`
    - Insert record into `crew_invite_links` with expires_at = now + 7 days
    - Return the link record and formatted URL `{base_url}/invite/crew/{token}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.12, 1.13, 5.10, 6.1, 6.2, 6.4, 6.5, 6.9_

  - [x] 2.2 Write property test: Token generation format (Property 1)
    - **Property 1: Token generation format**
    - For any generated invite link token, verify it matches `[A-Za-z0-9_-]+` with length 32–128, and URL matches `{base_url}/invite/crew/{token}`
    - **Validates: Requirements 1.1, 1.4, 6.1**

  - [x] 2.3 Write property test: Generated link record integrity (Property 2)
    - **Property 2: Generated link record integrity**
    - For any successfully generated invite link, verify crew_id matches request, created_by matches user, expires_at = created_at + 7 days
    - **Validates: Requirements 1.2, 1.3, 6.9**

  - [x] 2.4 Write property test: Generation precondition enforcement (Property 3)
    - **Property 3: Generation precondition enforcement**
    - For any crew violating at least one precondition (full, archived, 5 active links, event ended, invitation limit, rate limit), generation SHALL return error and no record created
    - **Validates: Requirements 1.5, 1.6, 1.7, 1.12, 5.10, 6.2, 6.4, 6.5**

  - [x] 2.5 Implement `revokeInviteLink` server action
    - Validate user is authenticated
    - Validate link exists and belongs to a crew the user is host/moderator of
    - Host can revoke any link for their crew
    - Moderator can revoke only links they created
    - Members and non-participants get permission error
    - Set status = 'revoked' and revoked_at = now()
    - _Requirements: 1.8, 5.2, 5.3, 5.4, 5.8_

  - [x] 2.6 Write property test: Revocation authorization (Property 5)
    - **Property 5: Revocation authorization**
    - Host can revoke any link; Moderator can revoke only own links; Member/non-participant gets permission error
    - **Validates: Requirements 5.3, 5.4, 5.8**

  - [x] 2.7 Implement `validateInviteToken` server action
    - Accept token string and optional userId
    - Validate in order: token exists → not revoked → not expired → crew exists → crew active → event not ended → crew not full → user not blocked → user not already member
    - Return discriminated union `InviteTokenValidationResult` with appropriate status
    - Include crew data, event data, and inviter data in 'valid' response
    - _Requirements: 1.9, 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13, 3.14, 3.15_

  - [x] 2.8 Write property test: Token validation rejects invalid states (Property 4)
    - **Property 4: Token validation rejects invalid states**
    - For any token that is expired or has status 'revoked'/'deactivated', validateInviteToken SHALL return non-valid status
    - **Validates: Requirements 1.9, 5.5**

  - [x] 2.9 Implement `joinViaInviteLink` server action
    - Re-validate token at join time (not expired, not revoked, not deactivated)
    - Validate: user authenticated, crew active, crew not full, event not ended, user not blocked, user not in another crew for same event, user not event organizer (non-system), user not kicked from this crew, total invitation count < 20
    - Insert into `event_crew_members` with role = 'member'
    - Increment `participant_count` on `event_crews`
    - Increment `use_count` on `crew_invite_links`
    - Insert into `crew_invite_link_joins` audit table
    - Cancel all pending invitations for user for same event
    - Cancel all pending join requests for user for same event
    - Insert system message: "{userName} joined the crew via invite link from {inviterName}."
    - Notify all existing crew members (reuse 'crew_member_joined' type)
    - If crew is now full, deactivate all active invite links for this crew
    - Return crewId and eventId on success
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 6.3, 6.4, 6.8, 6.11, 6.12, 7.1, 7.2_

  - [x] 2.10 Write property test: Join via link adds member and inserts system message (Property 6)
    - **Property 6: Join via link adds member and inserts system message**
    - For any valid link and eligible user, joining SHALL add member, increment count, and insert system message with joiner and inviter names
    - **Validates: Requirements 4.1, 7.2**

  - [x] 2.11 Write property test: Join precondition enforcement (Property 7)
    - **Property 7: Join precondition enforcement**
    - For any user violating at least one precondition (already in crew for event, is organizer, was kicked), join SHALL be rejected with no membership created
    - **Validates: Requirements 4.6, 4.8, 4.12, 6.11**

  - [x] 2.12 Write property test: Re-validation at join time (Property 8)
    - **Property 8: Re-validation at join time**
    - For any token valid at page load but invalid at join time (expired, revoked, deactivated), joinViaInviteLink SHALL reject
    - **Validates: Requirements 4.10**

  - [x] 2.13 Implement `getActiveInviteLinks` server action
    - Validate user is authenticated and is host/moderator of the crew
    - Return all active (non-expired, non-revoked) invite links for the crew
    - Include creator profile info (display_name) for each link
    - Sort by created_at descending
    - _Requirements: 5.1_

- [x] 3. Checkpoint - Core server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integration with existing crew actions
  - [x] 4.1 Implement `deactivateInviterLinks` helper function in `src/lib/actions/crew-invite.ts`
    - Accept crewId and userId
    - Update all active invite links where created_by = userId and crew_id = crewId to status = 'deactivated'
    - _Requirements: 1.14_

  - [x] 4.2 Modify `removeMember` in `src/lib/actions/crew.ts` to integrate invite link deactivation
    - After successful member removal, call `deactivateInviterLinks(crew_id, input.user_id)`
    - Insert record into `crew_kicked_members` table (crew_id, user_id, kicked_at, kicked_by)
    - _Requirements: 1.14, 4.12_

  - [x] 4.3 Modify `leaveCrew` in `src/lib/actions/crew.ts` to integrate invite link deactivation
    - After successful departure (all three cases: host with moderator, host without moderator, member/moderator), call `deactivateInviterLinks(crew_id, user.id)`
    - _Requirements: 1.14_

- [x] 5. Landing page route and OG metadata
  - [x] 5.1 Create invite link landing page at `src/app/[locale]/invite/crew/[token]/page.tsx`
    - Server component that reads token from params
    - Check authentication status
    - If not authenticated: redirect to login with `redirectTo=/invite/crew/{token}` param
    - Call `validateInviteToken(token, userId)` if authenticated
    - Based on result: render JoinConfirmationDialog, redirect to crew page, redirect to event page with toast, or render InviteLinkErrorState
    - Handle `already_member` → redirect to crew detail page
    - Handle `crew_full` → redirect to event page with toast query param
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.11, 3.13, 3.14, 3.15, 3.16, 3.17, 3.19_

  - [x] 5.2 Implement `generateMetadata` for OG tags in the landing page
    - Create `getInviteLinkOGData` helper that fetches minimal crew+event data by token (no auth required)
    - Return og:title with crew name, og:description with event name, og:image with event cover URL
    - Set robots to noindex, nofollow
    - Handle invalid tokens gracefully (return generic title)
    - _Requirements: 3.18_

  - [x] 5.3 Write property test: Landing page data completeness (Property 9)
    - **Property 9: Landing page data completeness**
    - For any valid invite link, the dialog data SHALL include event date/time, venue, crew name, participant count, capacity, available spots; OG metadata SHALL include crew name, event name, event cover URL
    - **Validates: Requirements 3.8, 3.18**

  - [x] 5.4 Write property test: Already-member redirect (Property 10)
    - **Property 10: Already-member redirect**
    - For any authenticated user already in the target crew, opening the link SHALL redirect to crew detail page without showing dialog
    - **Validates: Requirements 3.13, 3.14**

- [x] 6. Checkpoint - Landing page and integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI components
  - [x] 7.1 Create `InviteLinkShareCard` component at `src/components/crew/InviteLinkShareCard.tsx`
    - Display full URL as selectable text
    - "Copy to clipboard" button using `navigator.clipboard.writeText` with success toast (3s) and error fallback
    - "Share" button conditionally rendered when `navigator.share` is available
    - Pre-filled share text (localized): crew name + event name + URL
    - Handle clipboard write failure gracefully (show error toast, keep URL visible)
    - Handle share dialog cancellation without error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 7.2 Write property test: Share text completeness (Property 11)
    - **Property 11: Share text completeness**
    - For any crew name and event name, the share text SHALL contain crew name, event name, and full invite link URL
    - **Validates: Requirements 2.5**

  - [x] 7.3 Create `InviteLinkManager` component at `src/components/crew/InviteLinkManager.tsx`
    - Render inside existing CrewPanel for host/moderator users
    - "Generate Invite Link" button (disabled when at 5 active links, crew full, or event ended)
    - List of active invite links showing: creation date, expiration date, creator name, use count
    - Revoke button per link (respecting authorization: host can revoke any, moderator only own)
    - Show InviteLinkShareCard after successful generation
    - Display appropriate error messages for generation failures (rate limit, max links, etc.)
    - _Requirements: 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 5.8, 5.10_

  - [x] 7.4 Create `JoinConfirmationDialog` component at `src/components/crew/JoinConfirmationDialog.tsx`
    - Client component receiving crew, event, and inviter data as props
    - Display: crew name, event name, start date/time, venue, inviter name + avatar
    - Display participant count (e.g., "4/6") and available spots
    - "Присоединиться" (Join) button calling `joinViaInviteLink`
    - "Отклонить" (Decline) button redirecting to event detail page
    - Handle loading state during join action
    - Handle race condition error (crew filled) with redirect to event page + toast
    - _Requirements: 3.1, 3.8, 3.16, 3.17, 4.5, 4.9_

  - [x] 7.5 Create `InviteLinkErrorState` component at `src/components/crew/InviteLinkErrorState.tsx`
    - Accept error status as prop
    - Render localized error messages for each state: expired, revoked, crew_deleted, crew_archived, event_ended, invalid, blocked, kicked
    - Include appropriate icons and suggested actions (e.g., "ask sender for new link" for expired)
    - _Requirements: 3.4, 3.5, 3.6, 3.9, 3.10, 3.12, 3.19_

- [x] 8. i18n keys
  - [x] 8.1 Add invite link i18n keys to all message files (`src/messages/*.json`)
    - Add `invite.error.*` keys: invalid, expired, revoked, crewDeleted, crewArchived, crewFull, eventEnded, cannotJoin, alreadyInCrew, organizerCannotJoin
    - Add `invite.generate.*` keys: crewFull, crewArchived, maxLinks, invitationLimit, rateLimited, eventEnded
    - Add `invite.revoke.*` keys: notAuthorized
    - Add `invite.share.*` keys: clipboardFailed, copySuccess, shareText
    - Add `invite.join.*` keys: confirmTitle, confirmMessage, joinButton, declineButton, joining
    - Add `invite.manage.*` keys: title, generateButton, revokeButton, activeLinks, noLinks, createdBy, expiresAt, useCount
    - Add notification text key for join via link: "{userName} joined via invite link from {inviterName}"
    - Provide translations for all supported languages (check existing message files)
    - _Requirements: 3.19, 7.1, 7.2_

- [x] 9. Checkpoint - UI and i18n complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Wire components together
  - [x] 10.1 Integrate `InviteLinkManager` into existing Crew detail/management panel
    - Import and render InviteLinkManager in the crew management section
    - Pass crew data and user role as props
    - Conditionally render only for host/moderator users
    - Wire up data fetching with `getActiveInviteLinks`
    - _Requirements: 5.1_

  - [x] 10.2 Add post-login redirect handling for invite links
    - Ensure login/register pages preserve `redirectTo` query param
    - After successful auth, redirect to the preserved invite link URL
    - Handle the flow: unauthenticated → login → redirect back to invite page
    - _Requirements: 3.2, 3.3, 3.11_

  - [x] 10.3 Write unit tests for UI components and integration flows
    - Test clipboard copy success/failure handling
    - Test Web Share API availability detection
    - Test share dialog cancellation
    - Test redirect flow preservation through auth
    - Test OG metadata generation for various states
    - Test decline button redirect behavior
    - Test deactivation cascade on member removal/departure
    - Test voluntary leaver can rejoin vs kicked user cannot
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 3.2, 3.3, 4.12, 4.13_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript
- The existing `removeMember` and `leaveCrew` actions are modified in-place (task 4.2, 4.3) to integrate invite link deactivation
- The `crew_kicked_members` table is essential for enforcing Requirement 4.12 (kicked users cannot rejoin via link)
- Rate limiting (10 links per 24h) is enforced at the application level using the `created_at` index

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.5", "2.7", "2.13"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.8", "2.9"] },
    { "id": 3, "tasks": ["2.10", "2.11", "2.12", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "7.1", "7.5", "8.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 7, "tasks": ["10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3"] }
  ]
}
```
