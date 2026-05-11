# Requirements Document

## Introduction

Account Deletion — функция полного удаления аккаунта/профиля пользователя из приложения City Pulse. Реализует двухфазный процесс: soft delete с grace-периодом (пользователь может передумать) и последующий hard delete с анонимизацией контента. Функция необходима для соответствия GDPR (пользователи из ЕС через локали cs/de), а также для выполнения требований App Store и Google Play по обязательному наличию механизма удаления аккаунта. Процесс включает немедленное удаление из Supabase Auth, обработку связанных данных (события, crews, контакты, чаты, отзывы) и уведомление пользователя о последствиях.

## Glossary

- **Account_Deletion_Service**: Бэкенд-сервис, отвечающий за жизненный цикл удаления аккаунта: инициацию, grace-период, hard delete и анонимизацию.
- **Soft_Delete**: Первая фаза удаления — аккаунт помечается как удалённый, пользователь теряет доступ, но данные сохраняются в течение Grace_Period.
- **Hard_Delete**: Вторая фаза удаления — необратимое удаление персональных данных и анонимизация пользовательского контента после истечения Grace_Period.
- **Grace_Period**: Период в 30 дней после инициации Soft_Delete, в течение которого пользователь может восстановить аккаунт.
- **Anonymized_User**: Заглушка, заменяющая данные удалённого пользователя в публичном контенте (отзывы, сообщения). Отображается как "Deleted User" / "Удалённый пользователь".
- **Profile**: Запись в таблице profiles, содержащая персональные данные пользователя (имя, email, аватар, bio, город, интересы, социальные ссылки).
- **Event_Organizer**: Пользователь, являющийся организатором одного или нескольких событий (events.organizer_id).
- **Crew_Host**: Пользователь, являющийся хостом одного или нескольких Crew.
- **User_Content**: Контент, созданный пользователем: отзывы (event_reviews), сообщения в чатах (messages, event_crew_messages), комментарии (group_post_comments).
- **Personal_Data**: Данные, идентифицирующие пользователя: display_name, email, avatar_url, bio, city, country, languages, interests, social_links, age.
- **Deletion_Confirmation_Dialog**: UI-компонент, требующий от пользователя явного подтверждения удаления аккаунта с описанием последствий.
- **Reactivation**: Процесс восстановления аккаунта в течение Grace_Period путём повторного входа.

## Requirements

### Requirement 1: Инициация удаления аккаунта

**User Story:** As a user, I want to delete my account from the settings page so that I can permanently remove my data from City Pulse.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the profile settings page, THE Account_Deletion_Service SHALL display a "Delete Account" action in the danger zone section.
2. WHEN a user clicks "Delete Account", THE Account_Deletion_Service SHALL display the Deletion_Confirmation_Dialog with a summary of consequences: loss of access, anonymization of content, and the Grace_Period duration (30 days).
3. WHEN a user confirms deletion in the Deletion_Confirmation_Dialog, THE Account_Deletion_Service SHALL display a text input requiring the user to type the locale-specific confirmation word — "DELETE" (en), "УДАЛИТЬ" (ru), "ВИДАЛИТИ" (uk), "SMAZAT" (cs), "LÖSCHEN" (de) — as final confirmation.
4. IF the user submits a confirmation word that does not exactly match the expected locale-specific value (case-sensitive), THEN THE Account_Deletion_Service SHALL keep the dialog open, display an error message indicating the mismatch, and not initiate the deletion process.
5. WHEN a user submits the correct final confirmation, THE Account_Deletion_Service SHALL initiate the Soft_Delete process and record the deletion request timestamp.
6. IF the Soft_Delete process fails due to a Supabase Auth deletion error, THEN THE Account_Deletion_Service SHALL not mark the account as deleted, display an error message indicating the operation failed, and preserve the user's session and data unchanged.
7. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL remove the user from Supabase Auth using admin.deleteUser, terminating all active sessions within 5 seconds of the request.
8. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL send a confirmation email to the user's registered email address containing the Grace_Period end date and instructions for reactivation by logging in.
9. IF the user already has an active Soft_Delete request (deletion pending within Grace_Period), THEN THE Account_Deletion_Service SHALL not display the "Delete Account" action in the danger zone section.
10. THE Account_Deletion_Service SHALL display all Deletion_Confirmation_Dialog text in the user's current interface language (en, ru, uk, cs, de).

### Requirement 2: Grace-период и восстановление

**User Story:** As a user who deleted their account, I want to be able to restore it within 30 days so that I can recover my data if I change my mind.

#### Acceptance Criteria

1. THE Account_Deletion_Service SHALL maintain the Grace_Period of exactly 30 calendar days (720 hours) from the moment of Soft_Delete initiation, calculated from the deletion request timestamp recorded during Soft_Delete.
2. WHILE the Grace_Period is active, THE Account_Deletion_Service SHALL preserve all user data (Profile, event_attendees, event_reviews, messages, event_crew_messages, group_post_comments, user_photos, user_badges, notifications, event_favorites, user_contacts) in the database without modification.
3. WHILE the Grace_Period is active, THE Account_Deletion_Service SHALL hide the user's Profile from public views (search, event attendees, contacts).
4. WHEN a user submits login credentials (email and password or social login) matching a soft-deleted account during the Grace_Period, THE Account_Deletion_Service SHALL re-create the auth record in Supabase Auth, restore the session, and display a reactivation prompt offering two options: confirm reactivation or cancel and remain deleted.
5. WHEN a user confirms reactivation, THE Account_Deletion_Service SHALL remove the deletion request, restore the Profile to public visibility, and cancel the scheduled Hard_Delete.
6. IF a user dismisses or declines the reactivation prompt, THEN THE Account_Deletion_Service SHALL destroy the restored session, remove the re-created auth record, and maintain the account in Soft_Delete state with the original Grace_Period unchanged.
7. WHEN the Grace_Period expires without reactivation, THE Account_Deletion_Service SHALL automatically trigger the Hard_Delete process within 1 hour of expiry.
8. WHEN 27 calendar days have elapsed since Soft_Delete initiation (3 days before Grace_Period expiry), THE Account_Deletion_Service SHALL send a reminder email to the user's registered email address informing the user that Hard_Delete is imminent.
9. IF the reminder email delivery fails (bounce or undeliverable), THEN THE Account_Deletion_Service SHALL log the delivery failure and proceed with the scheduled Hard_Delete without retry.

### Requirement 3: Hard Delete — удаление персональных данных

**User Story:** As a platform operator, I want personal data to be permanently removed after the grace period so that City Pulse complies with GDPR data erasure requirements.

#### Acceptance Criteria

1. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL set the Profile record fields to anonymized values: display_name to "Deleted User", avatar_url to NULL, and all other Personal_Data fields (email, bio, city, country, languages, interests, social_links, age) to NULL.
2. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete the user's avatar file from Supabase Storage.
3. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete all user photos from the user_photos table and corresponding files from Supabase Storage.
4. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete all records from the notifications table where user_id matches the deleted user.
5. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete all records from the user_badges table where user_id matches the deleted user.
6. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete all records from the event_favorites table where user_id matches the deleted user.
7. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL delete all records from the user_subscriptions table where subscriber_id or target_user_id matches the deleted user.
8. IF a Supabase Storage file deletion fails during Hard_Delete, THEN THE Account_Deletion_Service SHALL log the failure, continue processing remaining deletions, and mark the Hard_Delete as partially completed for retry within 24 hours.
9. WHEN all Hard_Delete operations complete successfully, THE Account_Deletion_Service SHALL mark the deletion record as completed and record the completion timestamp.
10. THE Account_Deletion_Service SHALL execute all Hard_Delete database operations within a single transaction so that either all database changes are applied or none are.

### Requirement 4: Анонимизация пользовательского контента

**User Story:** As a platform operator, I want user-generated content to be anonymized rather than deleted so that event reviews and conversation context remain coherent for other users.

#### Acceptance Criteria

1. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL retain event_reviews records, preserve the rating and content text, and replace the user_id with the Anonymized_User sentinel UUID so that the author displays as Anonymized_User.
2. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL retain messages in conversations (messages table), preserve the message content text, and replace the sender_id with the Anonymized_User sentinel UUID so that the sender displays as Anonymized_User.
3. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL retain event_crew_messages where is_system = false, preserve the message content text, and replace the sender_id with the Anonymized_User sentinel UUID so that the sender displays as Anonymized_User.
4. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL retain group_post_comments records, preserve the comment content text, and replace the user_id with the Anonymized_User sentinel UUID so that the author displays as Anonymized_User.
5. WHILE a Profile record has display_name = "Deleted User" and avatar_url = NULL (Anonymized_User state), THE Account_Deletion_Service SHALL return "Deleted User" as display_name and NULL as avatar_url for all profile lookups referencing that user_id.
6. WHEN the Hard_Delete process is triggered, THE Account_Deletion_Service SHALL remove any personally identifiable text from review content, message content, and comment content that was used as a user signature or contained the user's display_name, by leaving the body text unchanged but relying solely on the Anonymized_User sentinel for author attribution.

### Requirement 5: Обработка событий организатора

**User Story:** As a platform operator, I want events created by a deleted user to remain accessible so that attendees and the community are not disrupted.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated for a user who is an Event_Organizer of future or in-progress events (ends_at > now, status = 'published'), THE Account_Deletion_Service SHALL transfer organizer_id of those events to the platform system account.
2. WHEN the Soft_Delete is initiated for a user who is an Event_Organizer of past events (ends_at <= now) or cancelled events (status = 'cancelled'), THE Account_Deletion_Service SHALL retain the events with the original organizer_id and display the organizer as Anonymized_User after Hard_Delete.
3. WHEN organizer_id is transferred to the platform system account, THE Account_Deletion_Service SHALL send a notification to all attendees of the affected events informing them of the organizer change within 5 seconds of the transfer.
4. WHEN the Soft_Delete is initiated for a user who is an event_moderator, THE Account_Deletion_Service SHALL remove the user from the event_moderators table for all events.
5. WHEN the Soft_Delete is initiated for a user who is an Event_Organizer of future events with status = 'draft', THE Account_Deletion_Service SHALL delete those draft events.
6. IF a user reactivates their account during the Grace_Period and their organizer_id was transferred to the platform system account, THEN THE Account_Deletion_Service SHALL restore the original organizer_id for all events that were transferred and have not yet ended (ends_at > now).
7. WHEN organizer_id is restored due to Reactivation, THE Account_Deletion_Service SHALL send a notification to all attendees of the affected events informing them that the original organizer has returned.

### Requirement 6: Обработка Crew-участия

**User Story:** As a platform operator, I want Crew memberships to be properly resolved when a user deletes their account so that remaining Crew members are not disrupted.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated for a user who is a Crew_Member or Crew_Moderator, THE Account_Deletion_Service SHALL remove the user from all active Crews (event_crew_members).
2. WHEN the Soft_Delete is initiated for a user who is a Crew_Host and at least one Crew_Moderator remains in that Crew, THE Account_Deletion_Service SHALL promote the Crew_Moderator with the earliest joined_at timestamp to Crew_Host.
3. WHEN the Soft_Delete is initiated for a user who is a Crew_Host and no Crew_Moderators remain in that Crew, THE Account_Deletion_Service SHALL delete the Crew and notify all remaining Crew_Members via the Notification_Service.
4. WHEN a user is removed from a Crew due to account deletion, THE Account_Deletion_Service SHALL post a system message "{UserName} left the crew" in the Crew_Chat.
5. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL cancel all pending crew_invitations where invitee_id matches the deleted user.
6. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL cancel all pending crew_join_requests where requester_id matches the deleted user.
7. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL cancel all pending crew_invitations where inviter_id matches the deleted user.

### Requirement 7: Обработка контактов

**User Story:** As a platform operator, I want contact relationships to be cleaned up when a user deletes their account so that other users' contact lists remain accurate.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL delete all records from user_contacts where owner_id matches the deleted user and all records where contact_id matches the deleted user within a single database transaction.
2. WHEN contact records are deleted due to account deletion, THE Profile_Stats_View SHALL reflect the updated follower_count and following_count for all affected users on the next query (no separate update action required, as the view computes counts from user_contacts).
3. IF the contact deletion transaction fails, THEN THE Account_Deletion_Service SHALL roll back all contact deletions for that user and report the failure to the Soft_Delete orchestrator without proceeding to subsequent deletion steps.
4. WHEN a user reactivates their account during the Grace_Period, THE Account_Deletion_Service SHALL NOT restore previously deleted contact records; the user starts with zero contacts.

### Requirement 8: Обработка чатов и переписок

**User Story:** As a platform operator, I want conversations to be handled gracefully when a user deletes their account so that the other participant retains access to message history.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL update the status of all conversations where the deleted user is participant_1 or participant_2 from their current status to "closed", preventing insertion of new messages into those conversations.
2. WHILE a conversation status is "closed" due to account deletion, THE Account_Deletion_Service SHALL allow the remaining participant to view all messages in the conversation but SHALL prevent sending new messages and deleting existing messages.
3. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL display the deleted user's messages with sender shown as Anonymized_User.
4. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL update all conversations with status = 'pending' where the deleted user is a participant to status = 'declined'.
5. IF both participants of a conversation have been deleted, THEN THE Account_Deletion_Service SHALL delete the conversation record and all associated messages during the Hard_Delete of the second participant.

### Requirement 9: Обработка RSVP и посещений

**User Story:** As a platform operator, I want event attendance records to be cleaned up when a user deletes their account so that event counts remain accurate.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL set the status to 'cancelled' for all event_attendees records with status in ('going', 'waitlist', 'interested') where the associated event starts_at is greater than the current timestamp.
2. WHEN an RSVP with status 'going' is cancelled due to account deletion for an event that has max_attendees configured, THE Account_Deletion_Service SHALL rely on the existing database trigger to promote the earliest waitlist entry to 'going' in FIFO order and send a 'promoted_from_waitlist' notification to the promoted user.
3. IF the batch RSVP cancellation during Soft_Delete partially fails, THEN THE Account_Deletion_Service SHALL roll back all attendance status changes for that user and report the failure to the deletion orchestrator without proceeding to subsequent deletion steps.
4. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL retain event_attendees records for past events (where event starts_at is less than or equal to the current timestamp) with the user_id column set to NULL and the display_name resolved as 'Anonymized_User' in any query or view that joins to the profiles table.
5. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL delete all event_attendees records for future events (where event starts_at is greater than the current timestamp) that were previously cancelled during Soft_Delete.

### Requirement 10: Обработка групп

**User Story:** As a platform operator, I want group memberships and admin roles to be resolved when a user deletes their account so that groups continue to function.

#### Acceptance Criteria

1. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL remove the user from all group_members records.
2. WHEN the Soft_Delete is initiated and the deleted user is the sole admin of a group and at least one moderator exists, THE Account_Deletion_Service SHALL promote the moderator with the earliest joined_at timestamp to admin.
3. WHEN the Soft_Delete is initiated and the deleted user is the sole admin of a group and no moderators exist but other members remain, THE Account_Deletion_Service SHALL promote the member with the earliest joined_at timestamp to admin.
4. WHEN the Soft_Delete is initiated and the deleted user is the created_by of a group and at least one other admin exists, THE Account_Deletion_Service SHALL transfer created_by to the admin with the earliest joined_at timestamp.
5. WHEN the Soft_Delete is initiated and the deleted user is the created_by of a group and no other admins exist, THE Account_Deletion_Service SHALL transfer created_by to the user promoted to admin per criteria 2 or 3.
6. IF no other members remain in a group after the user's removal from group_members, THEN THE Account_Deletion_Service SHALL set the group's is_blocked flag to true and remove it from public listings.
7. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL delete all records from group_subscriptions where user_id matches the deleted user.

### Requirement 11: Интернационализация

**User Story:** As a user, I want the account deletion flow to be fully translated so that I understand the consequences in my language.

#### Acceptance Criteria

1. THE Account_Deletion_Service SHALL provide all UI text for the deletion flow (Deletion_Confirmation_Dialog, confirmation keyword, reactivation prompt, and status messages) in all supported locales: en, ru, uk, cs, de.
2. WHEN the Soft_Delete is initiated, THE Account_Deletion_Service SHALL send the confirmation email in the user's preferred locale, determined by the `languages[0]` field on the user's Profile.
3. WHEN the Grace_Period reminder email is triggered, THE Account_Deletion_Service SHALL send it in the user's preferred locale, determined by the `languages[0]` field on the user's Profile.
4. THE Account_Deletion_Service SHALL display the Anonymized_User label in the viewer's current locale ("Deleted User", "Удалённый пользователь", "Видалений користувач", "Smazaný uživatel", "Gelöschter Benutzer").
5. IF the user's preferred locale cannot be determined (languages field is empty or null), THEN THE Account_Deletion_Service SHALL fall back to "en" for all email communications.

### Requirement 12: Аудит и безопасность

**User Story:** As a platform operator, I want account deletions to be logged for compliance and abuse prevention so that I can audit deletion activity.

#### Acceptance Criteria

1. WHEN a Soft_Delete is initiated, THE Account_Deletion_Service SHALL create an audit log entry recording the action type as deletion requested, the target user identifier, the identifier of the actor who initiated the request, and the request timestamp.
2. WHEN a Hard_Delete is completed, THE Account_Deletion_Service SHALL create an audit log entry recording the action type as deletion completed, the target user identifier, the identifier of the actor who initiated the request, and the completion timestamp.
3. WHEN a Reactivation occurs, THE Account_Deletion_Service SHALL create an audit log entry recording the action type as deletion cancelled, the target user identifier, the identifier of the actor who initiated the reactivation, and the reactivation timestamp.
4. THE Account_Deletion_Service SHALL rate-limit deletion requests to a maximum of one request per user per 24-hour rolling window.
5. IF a deletion request is submitted for a user who already has a deletion request within the preceding 24 hours, THEN THE Account_Deletion_Service SHALL reject the request and return an error indicating that the rate limit has been exceeded.
6. IF a user's account has been flagged for investigation with pending reports, THEN THE Account_Deletion_Service SHALL proceed with deletion but retain the audit log entry with a flag indicating that pending reports existed at the time of deletion.
7. THE Account_Deletion_Service SHALL ensure that audit log entries created for deletion events are immutable and cannot be modified or deleted through user-facing or administrative operations.

### Requirement 13: Обработка отчётов и блокировок

**User Story:** As a platform operator, I want reports filed by or against a deleted user to be handled appropriately so that moderation workflows are not disrupted.

#### Acceptance Criteria

1. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL retain reports where reporter_id matches the deleted user, replacing the reporter's display name and avatar in the admin interface with the label "Anonymized_User".
2. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL retain reports where target_id matches the deleted user and target_type = 'user', marking them as 'resolved' with resolution note "Account deleted".
3. IF a report exists where the deleted user is both reporter_id and target_id, THEN THE Account_Deletion_Service SHALL apply criterion 2 (mark as 'resolved' with resolution note "Account deleted") and anonymize the reporter identity per criterion 1.
4. WHEN the Hard_Delete is triggered, THE Account_Deletion_Service SHALL delete all block-list records where the deleted user appears as either the blocking party or the blocked party.
