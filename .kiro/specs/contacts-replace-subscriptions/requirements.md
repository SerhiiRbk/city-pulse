# Requirements Document

## Introduction

This feature consolidates the legacy "subscriptions" (`user_subscriptions`) system into the existing "contacts" (`user_contacts`) system. The "friends going" feature will use contacts instead of subscriptions to determine which connections are attending an event. The Follow button on user profiles will be replaced with an "Add to contacts" action (gated by interaction pool membership). The `user_subscriptions` table remains for backward compatibility but new code stops writing to it. Profile stats (`follower_count`) will reflect contacts instead of (or in addition to) subscriptions.

## Glossary

- **System**: The City Pulse application backend and frontend collectively
- **Contacts_Service**: The server-side module responsible for managing `user_contacts` records (currently `src/lib/actions/contacts.ts`)
- **Friends_Going_Service**: The server-side module that resolves which of a viewer's connections are attending a given event (currently `src/lib/actions/friends-going.ts`)
- **Profile_Stats_View**: The Supabase SQL view `profile_stats` that computes aggregate statistics for a user profile
- **Profile_Reputation_View**: The Supabase SQL view `profile_reputation` that computes reputation metrics including `follower_count`
- **Interaction_Pool**: The set of users who share at least one crew membership, an active chat conversation, or a mutual "going" RSVP on the same event with the current user
- **Contact_Button**: The UI component on user profile pages that allows adding or removing a user from the viewer's contacts (replaces the legacy Follow button)
- **User_Subscriptions_Table**: The legacy `user_subscriptions` table (subscriber_id, target_user_id) retained for backward compatibility
- **User_Contacts_Table**: The `user_contacts` table (owner_id, contact_id) that serves as the unified relationship store

## Requirements

### Requirement 1: Friends Going Uses Contacts

**User Story:** As a user, I want the "friends going" feature to show which of my contacts are attending an event, so that the displayed connections reflect people I have explicitly added rather than legacy follows.

#### Acceptance Criteria

1. WHEN the Friends_Going_Service resolves attendees for an event, THE Friends_Going_Service SHALL query `user_contacts` (where `owner_id` equals the current user) instead of `user_subscriptions` to determine the viewer's connection set.
2. WHEN the Friends_Going_Service resolves attendees in bulk for multiple events, THE Friends_Going_Service SHALL query `user_contacts` (where `owner_id` equals the current user) instead of `user_subscriptions`.
3. WHEN a user has zero contacts, THE Friends_Going_Service SHALL return an empty list for all events.
4. THE Friends_Going_Service SHALL preserve the existing sort order: going first, then waitlist, then interested, with ties broken by RSVP timestamp ascending.

### Requirement 2: Replace Follow Button with Contact Button

**User Story:** As a user viewing another person's profile, I want to see an "Add to contacts" button instead of "Follow", so that I can manage my contacts directly from the profile page.

#### Acceptance Criteria

1. WHEN the viewer is authenticated and the target user is in the viewer's Interaction_Pool and is not already a contact, THE System SHALL display an "Add to contacts" button on the target user's profile page.
2. WHEN the viewer is authenticated and the target user is already in the viewer's contacts, THE System SHALL display a "Remove from contacts" button on the target user's profile page.
3. WHEN the viewer is authenticated and the target user is not in the viewer's Interaction_Pool, THE System SHALL hide the contact action button entirely on the target user's profile page.
4. WHEN the viewer is not authenticated, THE System SHALL hide the contact action button on the target user's profile page.
5. WHEN the viewer taps "Add to contacts", THE Contacts_Service SHALL add the target user to the viewer's contacts and the button SHALL update to "Remove from contacts" without a full page reload.
6. WHEN the viewer taps "Remove from contacts", THE Contacts_Service SHALL remove the target user from the viewer's contacts and the button SHALL update to "Add to contacts" without a full page reload.

### Requirement 3: Deprecate Subscription Write Path

**User Story:** As a developer, I want new code to stop writing to `user_subscriptions`, so that the system converges on a single relationship model without breaking existing data.

#### Acceptance Criteria

1. THE System SHALL remove the `toggleFollow` server action so that no new code path inserts into or deletes from the User_Subscriptions_Table.
2. THE System SHALL remove the `isFollowing` server action so that no new code path queries the User_Subscriptions_Table for follow status.
3. THE System SHALL retain the User_Subscriptions_Table and its existing data for backward compatibility and potential future migration.
4. THE System SHALL remove the `FollowButton` component from the codebase.

### Requirement 4: Update Profile Stats to Use Contacts

**User Story:** As a user, I want my profile's "follower" count to reflect how many people have added me to their contacts, so that the displayed metric matches the active relationship system.

#### Acceptance Criteria

1. THE Profile_Stats_View SHALL compute `follower_count` as the number of rows in `user_contacts` where `contact_id` equals the profile user's ID (people who have the user in their contacts).
2. THE Profile_Stats_View SHALL compute `following_count` as the number of rows in `user_contacts` where `owner_id` equals the profile user's ID (people the user has added as contacts).
3. THE Profile_Reputation_View SHALL compute `follower_count` as the number of rows in `user_contacts` where `contact_id` equals the profile user's ID.
4. WHEN a user has zero contact relationships, THE Profile_Stats_View SHALL return 0 for both `follower_count` and `following_count`.

### Requirement 5: Update Internationalization Labels

**User Story:** As a user in any supported locale, I want the UI labels to reflect "contacts" terminology instead of "follow" terminology, so that the interface is consistent with the new model.

#### Acceptance Criteria

1. THE System SHALL replace the `follow` translation key with an `addToContacts` key across all 5 locales (en, ru, uk, cs, de).
2. THE System SHALL replace the `following` translation key with a `removeFromContacts` key across all 5 locales (en, ru, uk, cs, de).
3. THE System SHALL update the `followers` label used in profile stats to `contacts` (or locale-appropriate equivalent) across all 5 locales.
4. WHEN the profile stats section renders, THE System SHALL display the updated label next to the contact count.

### Requirement 6: Interaction Pool Check on Profile Page

**User Story:** As a developer, I want the profile page to efficiently determine whether the target user is in the viewer's interaction pool, so that the contact button visibility is resolved server-side without extra client round-trips.

#### Acceptance Criteria

1. WHEN the profile page loads for a non-own profile with an authenticated viewer, THE System SHALL call the `isInInteractionPool` check for the target user as part of the server-side data fetch.
2. THE System SHALL pass the pool membership result to the Contact_Button component as a prop so that no additional client-side fetch is required.
3. WHEN the profile page loads for the viewer's own profile, THE System SHALL skip the interaction pool check and hide the contact action button.
