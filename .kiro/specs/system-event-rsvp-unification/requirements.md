# Requirements Document

## Introduction

This feature unifies the RSVP behavior for system events with community events. Currently, system events use a separate "Interested" status that confuses users and fragments the attendance model. After this change, users will RSVP "Going" to system events using the same button and flow as community events, the "Interested" status will be removed entirely, and the "В календаре" section will reflect the unified model. System events remain unrestricted (no capacity limits or waitlists).

## Glossary

- **System_Event**: An event with `is_system = true` in the `events` table; a city-wide listing not owned by a community organizer
- **Community_Event**: An event with `is_system = false`; created and managed by a community organizer with capacity limits
- **RSVP_Action**: The `toggleAttendance` server action that sets a user's attendance status to 'going' or removes it
- **Interest_Action**: The deprecated `setInterest` server action that sets a user's attendance status to 'interested'
- **Event_Attendees_Table**: The `event_attendees` database table storing user attendance records with a `status` column
- **Event_Favorites_Table**: The `event_favorites` database table storing user bookmarks, independent of RSVP
- **Calendar_Section**: The "В календаре" section on `/events/my` showing events the user plans to attend
- **Going_Button**: The "Иду" UI button that triggers the RSVP_Action
- **Interaction_Pool**: The set of users with mutual 'going' RSVP on an event, used for Crew matching

## Requirements

### Requirement 1: System Event Going RSVP

**User Story:** As a user, I want to RSVP "Going" to system events using the same button as community events, so that I have a consistent experience across all event types.

#### Acceptance Criteria

1. WHEN a user clicks the Going_Button on a System_Event detail page, THE RSVP_Action SHALL insert a record into Event_Attendees_Table with status 'going' for that user and event
2. WHEN a user with status 'going' clicks the Going_Button on a System_Event, THE RSVP_Action SHALL remove the attendance record from Event_Attendees_Table
3. THE RSVP_Action SHALL accept System_Event identifiers without returning an error
4. WHEN a user RSVPs 'going' to a System_Event, THE System SHALL display the same Going_Button visual state as for Community_Event attendance

### Requirement 2: No Capacity Restrictions for System Events

**User Story:** As a user, I want to mark "Going" on any system event without being placed on a waitlist, so that I can always confirm my attendance to city-wide events.

#### Acceptance Criteria

1. WHEN a user RSVPs to a System_Event, THE RSVP_Action SHALL set the status to 'going' regardless of the number of existing attendees
2. THE RSVP_Action SHALL NOT apply waitlist logic to System_Event attendance
3. THE System SHALL NOT display a capacity indicator or waitlist count on System_Event pages

### Requirement 3: Remove Interested Status

**User Story:** As a system maintainer, I want the "Interested" status removed from system events, so that the attendance model is simplified and consistent.

#### Acceptance Criteria

1. THE System SHALL delete all existing records from Event_Attendees_Table where status is 'interested' and the associated event has `is_system = true` (via a data migration)
2. THE Interest_Action SHALL be removed from the codebase
3. THE System SHALL NOT allow inserting records with status 'interested' for System_Events
4. WHEN a Community_Event detail page is rendered, THE System SHALL NOT display the "Interested" toggle button (the star icon button previously available on community event pages)

### Requirement 4: Preserve Favorites Functionality

**User Story:** As a user, I want to continue bookmarking system events, so that I can save events for later without committing to attend.

#### Acceptance Criteria

1. THE System SHALL retain the Event_Favorites_Table and its existing functionality unchanged
2. WHEN a user toggles the favorite button on a System_Event, THE System SHALL insert or remove a record in Event_Favorites_Table independently of RSVP status
3. THE System SHALL display the favorite (bookmark) button on System_Event pages

### Requirement 5: Calendar Section Shows Going System Events

**User Story:** As a user, I want the "В календаре" section to show system events I marked "Going" to, so that my personal event agenda reflects my actual plans.

#### Acceptance Criteria

1. WHEN the Calendar_Section is rendered, THE System SHALL query Event_Attendees_Table for records where the user has status 'going' and the event has `is_system = true`
2. THE Calendar_Section SHALL display upcoming System_Events where the user has status 'going', ordered by start time ascending
3. THE Calendar_Section SHALL NOT display System_Events where the user only has a favorite record but no 'going' attendance

### Requirement 6: Crew Creation on System Events

**User Story:** As a user, I want to create crews on system events, so that I can find companions for city-wide events.

#### Acceptance Criteria

1. THE System SHALL treat all System_Events as having crew creation enabled regardless of the stored `allow_crews` value
2. WHEN a user has status 'going' on a System_Event, THE Interaction_Pool SHALL include that user for Crew matching on that event
3. WHEN two users both have status 'going' on the same System_Event, THE System SHALL allow them to be matched in a Crew

### Requirement 7: Remove Interest UI and Action

**User Story:** As a developer, I want the deprecated interest UI and server action removed, so that the codebase is clean and users cannot accidentally trigger the old flow.

#### Acceptance Criteria

1. THE System SHALL NOT render the "Интересует" (star icon) button on System_Event detail pages
2. THE System SHALL NOT render the "Интересует" (star icon) button on System_Event cards in listing pages
3. THE System SHALL remove the `setInterest` server action export from the events actions module
4. THE System SHALL remove the `handleToggleInterest` handler and related UI from the `SystemEventActions` component
5. THE System SHALL remove the `interested_count` display from System_Event cards
6. WHEN a client calls the removed Interest_Action endpoint, THE System SHALL return an error indicating the action does not exist
