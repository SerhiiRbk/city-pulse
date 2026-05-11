# Implementation Plan: Contacts Replace Subscriptions

## Overview

This plan migrates the "friends going" feature, profile stats, and profile UI from the legacy `user_subscriptions` system to the existing `user_contacts` system. The approach is: SQL migration first (views rewrite), then server-side action changes, then UI component swap, then cleanup of deprecated code, and finally i18n updates. Each task builds incrementally — no orphaned code.

## Tasks

- [x] 1. SQL migration: rewrite stats views to use `user_contacts`
  - [x] 1.1 Create database migration `supabase/migrations/065_contacts_replace_subscriptions.sql`
    - Rewrite `profile_stats` view: compute `follower_count` from `user_contacts` where `contact_id = user_id`, compute `following_count` from `user_contacts` where `owner_id = user_id`
    - Rewrite `profile_reputation` view: replace the followers CTE to query `user_contacts` (contact_id) instead of `user_subscriptions` (target_user_id)
    - Add indexes if missing: `idx_user_contacts_owner(owner_id)`, `idx_user_contacts_contact(contact_id)`
    - Use `COALESCE(..., 0)` for zero-contact users
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Modify Friends Going service to use contacts
  - [x] 2.1 Update `getFriendsGoing` in `src/lib/actions/friends-going.ts`
    - Replace `user_subscriptions` query with `user_contacts` query (select `contact_id` where `owner_id = user.id`)
    - Update intersection logic to use `contact_id` instead of `target_user_id`
    - Preserve existing sort order: going → waitlist → interested, ties broken by RSVP timestamp ascending
    - Return empty array when user has zero contacts
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 2.2 Update `getFriendsGoingBulk` in `src/lib/actions/friends-going.ts`
    - Same pattern: replace `user_subscriptions` with `user_contacts` query
    - Preserve per-event limit and existing return shape
    - _Requirements: 1.2, 1.3_

  - [x] 2.3 Write property test: friends-going returns only contacts who are attending (Property 1)
    - **Property 1: Friends-going returns only contacts who are attending**
    - Generate random contact lists and random attendee lists; verify result is exactly the intersection of contacts ∩ attendees with valid statuses
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.4 Write property test: friends-going sort order invariant (Property 2)
    - **Property 2: Friends-going sort order invariant**
    - Generate random attendees with mixed statuses and timestamps; verify output is sorted going < waitlist < interested, then by timestamp ascending within each group
    - **Validates: Requirements 1.4**

- [x] 3. Expose `isInInteractionPool` and add `isContact` helper
  - [x] 3.1 Export `isInInteractionPool` as a public server action in `src/lib/actions/contacts.ts`
    - Rename existing private helper to `isInInteractionPoolInternal` to avoid collision
    - Create public `isInInteractionPool(targetUserId: string): Promise<boolean>` that handles auth check and delegates to internal helper
    - Return `false` for unauthenticated users
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Add `isContact` helper in `src/lib/actions/contacts.ts`
    - Create `isContact(targetUserId: string): Promise<boolean>`
    - Query `user_contacts` where `owner_id = current user` and `contact_id = targetUserId`
    - Return `false` for unauthenticated users
    - _Requirements: 2.1, 2.2_

- [x] 4. Checkpoint - Backend changes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create ContactButton component and update profile page
  - [x] 5.1 Create `src/components/social/contact-button.tsx`
    - Client component with props: `targetUserId`, `isInPool`, `isContact`
    - If `!isInPool`, render `null` (hidden per requirement 2.3)
    - Use `useState` for optimistic toggle between "Add to contacts" / "Remove from contacts"
    - Call `addContact` / `removeContact` server actions on click
    - Update button state without full page reload
    - Use `useTranslations` for localized labels
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [x] 5.2 Write property test: contact button state derivation (Property 3)
    - **Property 3: Contact button state derivation**
    - Generate random boolean tuples (isAuthenticated, isOwnProfile, isInPool, isContact); verify deterministic output: hidden when not authenticated or own profile or not in pool; "Add to contacts" when in pool and not contact; "Remove from contacts" when in pool and contact
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 5.3 Update profile page `src/app/[locale]/profile/[id]/page.tsx`
    - Remove import of `FollowButton` and `isFollowing`
    - Add imports: `ContactButton`, `isInInteractionPool`, `isContact`
    - In server-side data fetch: call `isInInteractionPool(id)` and `isContact(id)` for non-own profiles
    - Skip interaction pool check for own profile
    - Pass `isInPool` and `isContact` as props to `ContactButton`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 6. Deprecate subscription write path and remove legacy code
  - [x] 6.1 Remove `toggleFollow` and `isFollowing` from `src/lib/actions/social.ts`
    - Delete the `toggleFollow` server action function
    - Delete the `isFollowing` server action function
    - Retain all other exports (`getProfileStats`, `getProfileReputation`, `getUserBadges`, etc.)
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Delete `src/components/social/follow-button.tsx`
    - Remove the entire file
    - _Requirements: 3.4_

  - [x] 6.3 Remove any remaining imports of `FollowButton`, `toggleFollow`, or `isFollowing` across the codebase
    - Search for and remove dead imports in any file that referenced these
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 7. Update i18n labels across all 5 locales
  - [x] 7.1 Update translation keys in `src/messages/{en,ru,uk,cs,de}.json`
    - Replace `follow` key with `addToContacts` key (locale-appropriate translations)
    - Replace `following` key with `removeFromContacts` key (locale-appropriate translations)
    - Update `followers` label in profile stats section to `contacts` (or locale-appropriate equivalent)
    - Ensure profile stats section renders the updated label next to the contact count
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Checkpoint - UI and i18n complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Property test for contact count correctness
  - [x] 9.1 Write property test: contact count correctness (Property 4)
    - **Property 4: Contact count correctness**
    - Generate random `user_contacts` rows; verify `follower_count` equals count where `contact_id = user_id` and `following_count` equals count where `owner_id = user_id`; verify zero when no relationships exist
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `user_subscriptions` table is intentionally NOT dropped — it remains for backward compatibility (Requirement 3.3)
- The SQL migration only replaces view definitions (no data changes); rollback is safe by re-running original view definitions
- The existing `addContact` / `removeContact` server actions in `contacts.ts` are reused as-is — no changes needed there

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 4, "tasks": ["6.3", "7.1"] },
    { "id": 5, "tasks": ["9.1"] }
  ]
}
```
