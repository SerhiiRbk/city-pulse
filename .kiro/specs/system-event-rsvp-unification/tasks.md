# Implementation Plan: System Event RSVP Unification

## Overview

Unify the RSVP model for system events with community events by replacing the "Interested" status with the standard "Going" status. Implementation proceeds bottom-up: database migration → server actions → UI components → page integration → cleanup.

## Tasks

- [x] 1. Database migration and server action changes
  - [x] 1.1 Create data migration `060_unify_system_event_rsvp.sql`
    - Create `supabase/migrations/060_unify_system_event_rsvp.sql`
    - Delete all `event_attendees` records where `status = 'interested'` and the event has `is_system = true`
    - Add a comment on `event_attendees` documenting the policy: system events only use `status = 'going'`
    - _Requirements: 3.1_

  - [x] 1.2 Modify `toggleAttendance` to support system events
    - In `src/lib/actions/events.ts`, remove the early-return guard that rejects system events with `'system_events_no_rsvp'`
    - Add a branch: when `ev?.is_system` is true, upsert `status = 'going'` directly without capacity/waitlist logic
    - Keep the community event path unchanged (DB trigger still handles waitlist downgrade)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [x] 1.3 Remove `setInterest` server action
    - Delete the entire `setInterest` function from `src/lib/actions/events.ts`
    - Remove all imports of `setInterest` across the codebase
    - _Requirements: 3.2, 7.3_

  - [x] 1.4 Rename `getProfileInterestedSystemEvents` to `getProfileGoingSystemEvents`
    - In `src/lib/actions/profile-data.ts`, rename the function
    - Change the query filter from `status = 'interested'` to `status = 'going'`
    - Update the import in `src/app/[locale]/events/my/page.tsx` to use the new name
    - _Requirements: 5.1, 5.2_

  - [x] 1.5 Write property test: Toggle round-trip (Property 1)
    - **Property 1: Toggle round-trip**
    - For any system event and authenticated user, calling `toggleAttendance` once → status 'going', calling again → status 'none'
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.6 Write property test: No capacity restriction (Property 2)
    - **Property 2: No capacity restriction for system events**
    - For any system event, regardless of existing attendee count, `toggleAttendance` always results in 'going', never 'waitlist'
    - **Validates: Requirements 2.1, 2.2**

  - [x] 1.7 Write property test: Interested status rejection (Property 3)
    - **Property 3: System events reject interested status**
    - After migration and code changes, no code path can create a record with `status = 'interested'` for a system event
    - **Validates: Requirements 3.3**

- [x] 2. Checkpoint - Ensure server-side changes are correct
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. UI component changes
  - [x] 3.1 Refactor `SystemEventActions` component to use Going button
    - In `src/components/events/system-event-actions.tsx`, replace `handleToggleInterest` with `handleToggleGoing` that calls `toggleAttendance`
    - Replace the Star icon button with a Going button (same style as community event `EventActions`)
    - Keep Favorite (Heart), Share, and AddToCalendar buttons unchanged
    - Remove all references to `setInterest`
    - _Requirements: 1.4, 7.1, 7.4_

  - [x] 3.2 Remove Interest button from event cards
    - In `src/components/events/event-card.tsx`, remove the interest star button and `interestedCount` display for system events
    - In `src/components/events/event-list-card.tsx`, remove the interest star button and `interestedCount` display for system events
    - Add Going button for system events reusing existing going toggle logic
    - _Requirements: 7.2, 7.5_

  - [x] 3.3 Write property test: Favorites orthogonal to RSVP (Property 4)
    - **Property 4: Favorites orthogonal to RSVP**
    - For any event and user, toggling favorite does not affect attendance, and toggling attendance does not affect favorites
    - **Validates: Requirements 4.1, 4.2**

  - [x] 3.4 Write property test: Calendar returns going system events sorted by time (Property 5)
    - **Property 5: Calendar returns going system events sorted by time**
    - For any user with 'going' records on system events, `getProfileGoingSystemEvents` returns exactly those upcoming system events ordered by `starts_at` ascending
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 4. Checkpoint - Ensure UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Page integration and cleanup
  - [x] 5.1 Update "В календаре" section on `/events/my` page
    - In `src/app/[locale]/events/my/page.tsx`, update the call from `getProfileInterestedSystemEvents` to `getProfileGoingSystemEvents`
    - Verify the section displays system events where user has `status = 'going'`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Update `getUserEventStatuses` to handle removal
    - In `src/lib/actions/events.ts`, the `interestedSet` in `getUserEventStatuses` can remain for backward compatibility with community events
    - Ensure system event cards no longer read from `interestedSet` for display purposes
    - _Requirements: 3.3, 3.4_

  - [x] 5.3 Clean up i18n keys related to "Интересует"
    - In `src/messages/en.json`, `ru.json`, `cs.json`, `de.json`, `uk.json`: replace `events.systemActions.interested` and `events.systemActions.markInterested` keys with Going equivalents (e.g., `going` and `markGoing`)
    - Remove any orphaned i18n keys that referenced the old interest flow
    - _Requirements: 7.1, 7.4_

  - [x] 5.4 Write property test: Crew always enabled for system events (Property 6)
    - **Property 6: Crew always enabled for system events**
    - For any system event, regardless of stored `allow_crews` value, crew creation is treated as enabled
    - **Validates: Requirements 6.1**

  - [x] 5.5 Write property test: Going users enter interaction pool (Property 7)
    - **Property 7: Going users enter interaction pool**
    - For any user with status 'going' on a system event, that user is included in the Crew interaction pool
    - **Validates: Requirements 6.2, 6.3**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The migration (task 1.1) is idempotent — safe to re-run if needed
- `getUserEventStatuses` retains `interestedSet` for backward compatibility with community events that may still have interested records
- No schema changes needed — `event_attendees` already supports `status = 'going'`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6", "1.7"] },
    { "id": 3, "tasks": ["3.1", "3.2", "5.1"] },
    { "id": 4, "tasks": ["3.3", "3.4", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5"] }
  ]
}
```
