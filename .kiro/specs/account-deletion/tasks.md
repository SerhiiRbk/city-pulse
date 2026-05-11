# Implementation Plan: Account Deletion

## Overview

Implement a two-phase account deletion system: a synchronous soft-delete server action that revokes access and cleans up relationships, and an hourly Edge Function that performs hard-delete (anonymization + data removal) after a 30-day grace period. The UI provides a confirmation dialog with locale-specific confirmation words, and a reactivation prompt for users who log in during the grace period.

## Tasks

- [x] 1. Database migration and foundational setup
  - [x] 1.1 Create database migration `supabase/migrations/066_account_deletion.sql`
    - Create `deletion_requests` table with all columns (id, user_id, requested_at, grace_period_ends_at, status, completed_at, cancelled_at, reminder_sent_at, reminder_failed, had_pending_reports, transferred_event_ids, metadata)
    - Add CHECK constraint on status: 'pending', 'completed', 'cancelled', 'partially_completed'
    - Create unique partial index `idx_deletion_requests_active` on (user_id) WHERE status = 'pending'
    - Create index `idx_deletion_requests_expiry` on (grace_period_ends_at) WHERE status = 'pending'
    - Add `deleted_at TIMESTAMPTZ` column to profiles table
    - Update RLS policy on profiles to exclude `deleted_at IS NOT NULL`
    - Insert sentinel profile row (UUID `00000000-0000-0000-0000-000000000000`, display_name = 'Deleted User', role = 'system')
    - Enable RLS on deletion_requests with appropriate policies
    - _Requirements: 2.1, 2.3, 3.1, 4.5_

  - [x] 1.2 Create pure logic module `src/lib/deletion/confirmation.ts`
    - Export `CONFIRMATION_WORDS` map: { en: 'DELETE', ru: 'УДАЛИТЬ', uk: 'ВИДАЛИТИ', cs: 'SMAZAT', de: 'LÖSCHEN' }
    - Export `validateConfirmationWord(locale: string, input: string): boolean` — exact case-sensitive match
    - _Requirements: 1.3, 1.4, 11.1_

  - [x] 1.3 Create pure logic module `src/lib/deletion/locale.ts`
    - Export `determineEmailLocale(languages: string[] | null): string` — returns languages[0] if valid supported locale, else 'en'
    - Export `ANONYMIZED_USER_LABELS` map: { en: 'Deleted User', ru: 'Удалённый пользователь', uk: 'Видалений користувач', cs: 'Smazaný uživatel', de: 'Gelöschter Benutzer' }
    - Export `getAnonymizedUserLabel(viewerLocale: string): string` — returns locale-specific label with 'en' fallback
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

  - [x] 1.4 Create pure logic module `src/lib/deletion/classification.ts`
    - Export `classifyEvents(events, now)` — categorizes events into: transfer (future published), delete (future draft), retain (past/cancelled)
    - Export `classifyCrewSuccession(crew)` — determines: promote moderator, delete crew, or no action
    - Export `classifyGroupSuccession(group)` — determines: promote moderator, promote member, block group
    - _Requirements: 5.1, 5.2, 5.5, 6.2, 6.3, 10.2, 10.3, 10.6_

- [x] 2. Property tests for pure logic modules
  - [x] 2.1 Write property test for confirmation word validation
    - **Property 1: Confirmation word validation is locale-deterministic**
    - **Validates: Requirements 1.3, 1.4**
    - File: `src/__tests__/properties/account-deletion-confirmation.property.test.ts`
    - Generate random strings × 5 locales, verify exact match semantics

  - [x] 2.2 Write property test for grace period calculation
    - **Property 3: Grace period calculation is exactly 720 hours**
    - **Validates: Requirements 2.1**
    - File: `src/__tests__/properties/account-deletion-grace-period.property.test.ts`
    - Generate random timestamps, verify grace_period_ends_at = requested_at + 720 hours

  - [x] 2.3 Write property test for profile anonymization
    - **Property 5: Profile anonymization zeroes all personal data**
    - **Validates: Requirements 3.1**
    - File: `src/__tests__/properties/account-deletion-anonymize.property.test.ts`
    - Generate random Profile records, verify anonymization output

  - [x] 2.4 Write property test for content anonymization
    - **Property 6: Content anonymization preserves text and replaces author reference**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6**
    - File: `src/__tests__/properties/account-deletion-anonymize.property.test.ts` (same file, separate describe block)
    - Generate random content records, verify text preserved and author replaced with sentinel UUID

  - [x] 2.5 Write property test for event organizer classification
    - **Property 7: Event organizer classification is correct by event state**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - File: `src/__tests__/properties/account-deletion-event-classification.property.test.ts`
    - Generate random event sets with varying dates/statuses

  - [x] 2.6 Write property test for crew host succession
    - **Property 8: Crew host succession follows earliest-moderator rule**
    - **Validates: Requirements 6.2, 6.3**
    - File: `src/__tests__/properties/account-deletion-crew-succession.property.test.ts`
    - Generate random crew configurations (0-N moderators, varying joined_at)

  - [x] 2.7 Write property test for group admin succession
    - **Property 13: Group admin succession follows promotion hierarchy**
    - **Validates: Requirements 10.2, 10.3, 10.6**
    - File: `src/__tests__/properties/account-deletion-group-succession.property.test.ts`
    - Generate random group configurations

  - [x] 2.8 Write property test for email locale determination
    - **Property 14: Email locale determination uses languages[0] with fallback**
    - **Validates: Requirements 11.2, 11.3, 11.5**
    - File: `src/__tests__/properties/account-deletion-locale.property.test.ts`
    - Generate random languages arrays

  - [x] 2.9 Write property test for anonymized user label resolution
    - **Property 15: Anonymized user label resolves correctly per viewer locale**
    - **Validates: Requirements 11.4**
    - File: `src/__tests__/properties/account-deletion-locale.property.test.ts` (same file, separate describe block)
    - All locale combinations + unsupported locales

  - [x] 2.10 Write property test for deletion rate limiting
    - **Property 16: Deletion rate limit rejects requests within 24-hour window**
    - **Validates: Requirements 12.4, 12.5**
    - File: `src/__tests__/properties/account-deletion-rate-limit.property.test.ts`
    - Generate random timestamp pairs, verify 24-hour window logic

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Soft delete orchestrator implementation
  - [x] 4.1 Create soft delete orchestrator `src/lib/actions/deletion/soft-delete-orchestrator.ts`
    - Implement `SoftDeleteContext` and `SoftDeleteStep` interfaces
    - Implement `executeSoftDelete` function with ordered step execution and rollback on failure
    - Steps execute in order: transferEventOrganizers → resolveCrews → resolveGroups → cancelFutureRsvps → closeConversations → removeContacts → cancelCrewInvitations → removeEventModerators → deleteAuthRecord → createDeletionRequest → sendConfirmationEmail
    - On step failure: roll back completed steps in reverse order, return `{ success: false, failedStep }`
    - _Requirements: 1.5, 1.6, 1.7_

  - [x] 4.2 Implement `transferEventOrganizers` step
    - Transfer organizer_id to system account for future published events (ends_at > now, status = 'published')
    - Delete draft events (status = 'draft')
    - Retain past/cancelled events unchanged
    - Store transferred event IDs in context for potential reactivation restore
    - Send notification to attendees of transferred events
    - Remove user from event_moderators table
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Implement `resolveCrews` step
    - Remove user from all event_crew_members
    - If user is Crew_Host and moderators exist: promote earliest moderator to host
    - If user is Crew_Host and no moderators: delete crew, notify remaining members
    - Post system message "{UserName} left the crew" in crew chat
    - Cancel pending crew_invitations (invitee_id and inviter_id)
    - Cancel pending crew_join_requests (requester_id)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.4 Implement `resolveGroups` step
    - Remove user from group_members
    - If sole admin and moderators exist: promote earliest moderator to admin
    - If sole admin and no moderators but members exist: promote earliest member to admin
    - Transfer created_by if user is group creator
    - If no members remain: set is_blocked = true
    - Delete group_subscriptions for user
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 4.5 Implement `cancelFutureRsvps` step
    - Set status = 'cancelled' for event_attendees where status IN ('going', 'waitlist', 'interested') AND event.starts_at > now()
    - Rely on existing DB trigger for waitlist promotion
    - Roll back all changes on partial failure
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 4.6 Implement `closeConversations` step
    - Update conversations where user is participant_1 or participant_2 and status = 'active' to status = 'closed'
    - Update conversations with status = 'pending' to status = 'declined'
    - _Requirements: 8.1, 8.4_

  - [x] 4.7 Implement `removeContacts` step
    - Delete all user_contacts where owner_id = user_id OR contact_id = user_id in a single transaction
    - Roll back on failure, report to orchestrator
    - _Requirements: 7.1, 7.3_

  - [x] 4.8 Implement `deleteAuthRecord` and `createDeletionRequest` steps
    - Call supabase admin.deleteUser to remove from Supabase Auth
    - Insert deletion_requests record with status = 'pending', grace_period_ends_at = now + 30 days
    - Set profiles.deleted_at = now()
    - Create audit log entry (action: 'deletion_requested')
    - Handle critical error if deletion_request insert fails after auth deletion
    - _Requirements: 1.5, 1.7, 2.1, 12.1_

  - [x] 4.9 Implement `sendConfirmationEmail` step
    - Send confirmation email via Resend in user's preferred locale
    - Include grace period end date and reactivation instructions
    - Log failure but don't abort deletion (non-critical)
    - _Requirements: 1.8, 11.2_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Server action and rate limiting
  - [x] 6.1 Create server action `src/lib/actions/account-deletion.ts`
    - Implement `deleteAccount(input: DeleteAccountInput): Promise<DeleteAccountResult>`
    - Validate user is authenticated
    - Check no active deletion request exists (ALREADY_PENDING)
    - Check rate limit: no deletion request in last 24 hours (RATE_LIMITED)
    - Validate confirmation word against user's current locale (INVALID_CONFIRMATION)
    - Check for pending reports, set had_pending_reports flag
    - Call `executeSoftDelete` orchestrator
    - Return appropriate error codes on failure
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.9, 12.4, 12.5, 12.6_

  - [x] 6.2 Implement `getDeletionStatus` function
    - Query deletion_requests for active pending request for current user
    - Return `{ isPending: boolean, expiresAt: string | null }`
    - _Requirements: 1.9_

  - [x] 6.3 Write property test for delete button visibility
    - **Property 2: Delete button visibility is determined by deletion state**
    - **Validates: Requirements 1.1, 1.9**
    - File: `src/__tests__/properties/account-deletion-button-state.property.test.ts`
    - Boolean combinations of auth/deletion state

  - [x] 6.4 Write property tests for conversation closure and RSVP cancellation
    - **Property 9: All active conversations are closed on soft delete**
    - **Validates: Requirements 8.1, 8.4**
    - **Property 11: Only future active RSVPs are cancelled on soft delete**
    - **Validates: Requirements 9.1**
    - File: `src/__tests__/properties/account-deletion-conversations.property.test.ts`
    - File: `src/__tests__/properties/account-deletion-rsvp.property.test.ts`
    - Generate random conversation/attendance sets with varying statuses and dates

- [x] 7. Hard delete Edge Function
  - [x] 7.1 Create Edge Function `supabase/functions/hard-delete-accounts/index.ts`
    - Query deletion_requests where grace_period_ends_at <= now() AND status = 'pending'
    - For each expired request, execute hard delete within a database transaction
    - Anonymize profile: set display_name = 'Deleted User', avatar_url = NULL, all personal data fields to NULL
    - Anonymize content: update event_reviews, messages, event_crew_messages (is_system = false), group_post_comments — replace user_id/sender_id with sentinel UUID
    - Delete storage files (avatar + user_photos) — log failures, continue
    - Delete records: notifications, user_badges, event_favorites, user_subscriptions
    - Handle past event_attendees: set user_id = NULL for past events, delete cancelled future records
    - Resolve reports: anonymize reporter, mark target reports as 'resolved'
    - Delete block-list records
    - Mark deletion_requests as 'completed' with completion timestamp
    - Create audit log entry (action: 'deletion_completed')
    - On storage failure: mark as 'partially_completed' for retry
    - _Requirements: 3.1–3.10, 4.1–4.6, 9.4, 9.5, 12.2, 13.1–13.4_

  - [x] 7.2 Create pg_cron schedule migration
    - Add pg_cron job to invoke hard-delete-accounts Edge Function every hour
    - Add pg_cron job for reminder emails at day 27
    - _Requirements: 2.7, 2.8, 2.9_

  - [x] 7.3 Write property test for past attendance anonymization
    - **Property 12: Past attendance records are anonymized with NULL user_id**
    - **Validates: Requirements 9.4**
    - File: `src/__tests__/properties/account-deletion-rsvp.property.test.ts` (same file, separate describe block)
    - Generate random attendance records with varying event dates

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Reactivation flow
  - [x] 9.1 Implement reactivation logic in `src/lib/actions/account-deletion.ts`
    - Implement `reactivateAccount()`: remove deletion_request, restore profile visibility (set deleted_at = NULL), cancel scheduled hard delete, restore transferred event organizer_ids (for events not yet ended), send notification to attendees of restored events, create audit log entry (action: 'deletion_cancelled')
    - Implement `declineReactivation()`: destroy session, remove re-created auth record, maintain soft-delete state
    - _Requirements: 2.4, 2.5, 2.6, 5.6, 5.7, 12.3_

  - [x] 9.2 Create reactivation middleware/check in auth flow
    - On login: check if email matches a soft-deleted account with active deletion_request
    - If match found: re-create auth record, restore session, redirect to reactivation prompt
    - If grace period expired during flow: return error "Account permanently deleted"
    - _Requirements: 2.4, 2.6_

- [x] 10. UI components
  - [x] 10.1 Create `DeleteAccountSection` component
    - Add danger zone section to profile edit page (`src/app/[locale]/profile/edit/page.tsx`)
    - Show "Delete Account" button only if user has no active deletion request
    - Use destructive button styling
    - _Requirements: 1.1, 1.9_

  - [x] 10.2 Create `DeletionConfirmationDialog` component
    - Modal dialog with consequences summary: loss of access, content anonymization, 30-day grace period
    - Locale-specific confirmation word input
    - Validate input matches expected word (case-sensitive) before enabling submit
    - Show error message on mismatch
    - All text translated via next-intl
    - _Requirements: 1.2, 1.3, 1.4, 1.10, 11.1_

  - [x] 10.3 Create `ReactivationPrompt` component
    - Shown after login when user has active deletion request
    - Two options: "Reactivate Account" and "Keep Deleted"
    - Calls `reactivateAccount()` or `declineReactivation()` server actions
    - All text translated via next-intl
    - _Requirements: 2.4, 2.5, 2.6, 11.1_

- [x] 11. Internationalization
  - [x] 11.1 Add i18n translation keys for all 5 locales
    - Add keys to `src/messages/en.json`, `ru.json`, `uk.json`, `cs.json`, `de.json`
    - Keys for: delete button, confirmation dialog title/body/consequences, confirmation word label, error messages, reactivation prompt, success messages
    - Include anonymized user labels
    - _Requirements: 1.10, 11.1, 11.4_

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration wiring and final validation
  - [x] 13.1 Wire DeleteAccountSection into profile edit page
    - Import and render DeleteAccountSection in `src/app/[locale]/profile/edit/page.tsx`
    - Pass deletion status from `getDeletionStatus()` to control visibility
    - _Requirements: 1.1, 1.9_

  - [x] 13.2 Wire reactivation check into auth/login flow
    - Add reactivation check after successful authentication
    - Redirect to reactivation prompt page/modal when applicable
    - _Requirements: 2.4_

  - [x] 13.3 Update profile queries to respect deleted_at filter
    - Ensure all public profile queries (search, attendees, contacts) exclude profiles with deleted_at IS NOT NULL
    - Ensure anonymized user label is returned for sentinel UUID lookups
    - _Requirements: 2.3, 4.5, 11.4_

  - [x] 13.4 Write property test for soft-deleted profile exclusion
    - **Property 4: Soft-deleted profiles are excluded from public queries**
    - **Validates: Requirements 2.3**
    - File: `src/__tests__/properties/account-deletion-button-state.property.test.ts` (or separate file)
    - Generate profiles with varying deleted_at states

  - [x] 13.5 Write property test for read-only closed conversations
    - **Property 10: Closed conversations allow read-only access**
    - **Validates: Requirements 8.2**
    - File: `src/__tests__/properties/account-deletion-conversations.property.test.ts`
    - Verify read allowed, write/delete blocked for closed conversations

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The soft-delete orchestrator uses step-based execution with rollback — if any step fails, previously completed steps are rolled back in reverse order
- The hard-delete Edge Function runs hourly via pg_cron and processes all expired grace periods
- Contacts are NOT restored on reactivation (Requirement 7.4) — user starts fresh
- The sentinel UUID `00000000-0000-0000-0000-000000000000` is used for all anonymized content attribution

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 4, "tasks": ["4.8", "4.9"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4", "7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "11.1"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 10, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 11, "tasks": ["13.4", "13.5"] }
  ]
}
```
