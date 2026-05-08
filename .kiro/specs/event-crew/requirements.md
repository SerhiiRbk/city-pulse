# Requirements Document

## Introduction

Event Crew — это групповая функция (от 2 до 10 человек), позволяющая пользователям координировать совместное посещение мероприятия. Заменяет существующую систему meetup (SystemEventMeetups). Crew привязан к конкретному событию, имеет собственный групповой чат и поддерживает публичный (запрос на вступление) и приватный (только по приглашению) режимы. В Crew действует иерархия ролей: один Хост, опциональные Модераторы и Участники. Crew автоматически архивируется через 14 дней после окончания события, сохраняя историю чата в режиме "только для чтения".

## Glossary

- **Crew**: Группа от 2 до 10 пользователей, созданная для совместного посещения конкретного события. Имеет название, описание, вместимость, поддерживаемые языки.
- **Crew_Host**: Пользователь, создавший Crew. Имеет полные права: приглашение участников, назначение/снятие Модераторов, принятие/отклонение запросов на вступление, удаление участников, переключение режима видимости, удаление Crew.
- **Crew_Moderator**: Участник Crew, повышенный Хостом. Может приглашать участников и управлять запросами на вступление. Не может удалять участников или удалять Crew.
- **Crew_Member**: Обычный участник Crew с доступом к Crew_Chat.
- **Crew_Chat**: Групповой чат, связанный с Crew, доступный всем участникам (Хост, Модераторы, Участники).
- **Event_Organizer**: Пользователь, создавший или управляющий событием, к которому привязан Crew.
- **Contact**: Пользователь, вручную добавленный в список контактов из Interaction_Pool.
- **Interaction_Pool**: Набор пользователей, доступных для добавления в контакты. Определяется совместным участием в Crew, одобренной перепиской или взаимным RSVP "going" на одно событие.
- **Crew_Invitation**: Уведомление, отправленное пользователю с приглашением присоединиться к Crew, с опциональным пользовательским текстом.
- **Join_Request**: Запрос от не-участника на вступление в публичный Crew, с опциональным сообщением.
- **Archival**: Процесс перевода Crew в состояние "только для чтения" через 14 дней после окончания связанного события.
- **System_Event**: Редакционно курируемое событие (is_system = true), где флаг "Разрешить посещение компанией" всегда включён.
- **Community_Event**: Пользовательское событие (is_system = false), где Event_Organizer управляет флагом "Разрешить посещение компанией".
- **Crew_Service**: Бэкенд-сервис, отвечающий за жизненный цикл Crew, приглашения и архивацию.
- **Notification_Service**: Существующая система уведомлений для доставки уведомлений, связанных с Crew.

## Requirements

### Requirement 1: Crew Creation

**User Story:** As a user attending an event, I want to create a Crew so that I can coordinate going to the event with friends.

#### Acceptance Criteria

1. WHEN a user navigates to an event page where the "Allow attending as a crew" flag is enabled, THE Crew_Service SHALL display a "Create a Crew" action button.
2. WHEN a user is the Event_Organizer of the event, THE Crew_Service SHALL hide the "Create a Crew" action button.
3. WHEN a user submits the Crew creation form, THE Crew_Service SHALL require a Crew name (3 to 120 characters).
4. WHEN a user submits the Crew creation form without a custom name, THE Crew_Service SHALL use the default name "Компания на {event_name}".
5. WHEN a user submits the Crew creation form, THE Crew_Service SHALL accept an optional description (up to 2000 characters).
6. WHEN a user submits the Crew creation form, THE Crew_Service SHALL require a capacity value between 2 and 10.
7. WHEN a user submits the Crew creation form, THE Crew_Service SHALL allow selecting one or more supported languages from the platform's language list.
8. WHEN a user submits the Crew creation form, THE Crew_Service SHALL require the user to select either public or private mode.
9. WHEN a Crew is created, THE Crew_Service SHALL assign the creator as the Crew_Host.
10. WHEN a Crew is created, THE Crew_Service SHALL create a Crew_Chat channel for the Crew.

### Requirement 2: Crew Role Hierarchy

**User Story:** As a Crew_Host, I want to assign Moderators so that they can help manage invitations and join requests.

#### Acceptance Criteria

1. THE Crew_Service SHALL support three roles per Crew: Crew_Host (exactly one), Crew_Moderator (zero or more), and Crew_Member (zero or more).
2. WHEN a Crew_Host assigns a Crew_Member as Crew_Moderator, THE Crew_Service SHALL grant that member invitation and join-request management permissions.
3. WHEN a Crew_Host removes a Crew_Moderator role from a participant, THE Crew_Service SHALL revoke invitation and join-request management permissions and revert the participant to Crew_Member role.
4. THE Crew_Service SHALL allow only the Crew_Host to assign or remove the Crew_Moderator role.
5. THE Crew_Service SHALL allow only the Crew_Host to remove Crew_Members from the Crew.
6. THE Crew_Service SHALL allow only the Crew_Host to delete the Crew.
7. THE Crew_Service SHALL allow both the Crew_Host and Crew_Moderators to send Crew_Invitations.
8. THE Crew_Service SHALL allow both the Crew_Host and Crew_Moderators to accept or reject Join_Requests.

### Requirement 3: Crew Invitation System

**User Story:** As a Crew_Host or Crew_Moderator, I want to invite people to my Crew so that we can attend the event together.

#### Acceptance Criteria

1. WHEN a Crew_Host or Crew_Moderator invites a user, THE Crew_Service SHALL send a Crew_Invitation notification to the invitee.
2. WHEN the inviter does not provide custom invitation text, THE Crew_Service SHALL use the default text "{HostName} invites you to join a crew for {EventTitle}" in the sender's interface language.
3. WHEN a Crew_Invitation with default text is delivered to the recipient, THE Notification_Service SHALL display the default text in the recipient's interface language.
4. WHEN the inviter provides custom invitation text, THE Crew_Service SHALL deliver the text as-is without translation.
5. THE Crew_Service SHALL enforce a maximum of 300 characters for custom invitation text.
6. WHEN an invitee accepts a Crew_Invitation, THE Crew_Service SHALL add the invitee as a Crew_Member and grant access to the Crew_Chat.
7. WHEN an invitee declines a Crew_Invitation, THE Crew_Service SHALL mark the invitation as declined and not add the user to the Crew.
8. WHEN the Crew has reached its configured capacity, THE Crew_Service SHALL prevent sending new invitations.
9. WHEN a Crew_Host or Crew_Moderator invites users during Crew creation, THE Crew_Service SHALL allow selecting from the inviter's contacts and from users who have RSVP'd "going" to the same event.
10. IF the target user is already a participant of another Crew for the same event, THEN THE Crew_Service SHALL prevent sending a Crew_Invitation to that user.
11. WHEN a user accepts a Crew_Invitation for an event, THE Crew_Service SHALL automatically decline all pending Crew_Invitations for that user to other Crews for the same event.
12. WHEN a user who was previously removed from a Crew by the Crew_Host is invited again, THE Crew_Service SHALL treat the invitation as a new invitation (not a duplicate).

### Requirement 4: Public and Private Crew Modes

**User Story:** As a Crew_Host, I want to choose whether my Crew is open to join requests or invite-only so that I can control membership.

#### Acceptance Criteria

1. WHEN a Crew is in private mode, THE Crew_Service SHALL allow joining only via Crew_Invitation.
2. WHEN a Crew is in private mode, THE Crew_Service SHALL display only the aggregate count of Crews on the event page (e.g., "2 crews").
3. WHEN a Crew is in public mode, THE Crew_Service SHALL display the Crew name, supported languages, and available spots on the event page (e.g., "Artem's crew — 4/6 spots").
4. WHEN a Crew_Host toggles the Crew from private to public mode, THE Crew_Service SHALL make the Crew visible to all users viewing the event page.
5. WHEN a user submits a Join_Request to a public Crew, THE Crew_Service SHALL notify the Crew_Host and all Crew_Moderators of the request.
6. THE Crew_Service SHALL enforce a maximum of 300 characters for Join_Request messages.
7. WHEN a Crew_Host or Crew_Moderator accepts a Join_Request, THE Crew_Service SHALL add the requester as a Crew_Member and grant access to the Crew_Chat.
8. WHEN a Crew_Host or Crew_Moderator rejects a Join_Request, THE Crew_Service SHALL notify the requester that the request was declined.
9. WHEN the Crew has reached its configured capacity, THE Crew_Service SHALL hide the "Request to join" button for public Crews.
10. THE Crew_Service SHALL allow the Crew_Host to change the Crew mode between public and private at any time while the Crew is active.

### Requirement 5: Crew Chat

**User Story:** As a Crew participant, I want to chat with other Crew members so that we can coordinate plans for the event.

#### Acceptance Criteria

1. WHEN a Crew is created, THE Crew_Service SHALL create a group chat accessible to the Crew_Host.
2. WHEN a new participant joins the Crew, THE Crew_Chat SHALL grant the new participant access to the full message history.
3. WHILE a Crew is in active state, THE Crew_Chat SHALL allow all participants (Host, Moderators, and Members) to send and receive messages.
4. WHILE a Crew is in archived state, THE Crew_Chat SHALL display all messages as read-only and reject new messages.
5. THE Crew_Chat SHALL support the number of participants defined by the Crew's configured capacity (2 to 10).
6. WHEN a new participant joins the Crew, THE Crew_Chat SHALL display a system message "{UserName} joined the crew."
7. WHEN a participant leaves the Crew, THE Crew_Chat SHALL display a system message "{UserName} left the crew."
8. WHEN the Crew_Host updates the Crew description, THE Crew_Chat SHALL display a system message "Host updated description of crew."
9. THE Crew_Chat SHALL visually distinguish system messages from regular participant messages.

### Requirement 6: Event Page Display

**User Story:** As a user browsing events, I want to see how many people and Crews are attending so that I can gauge event popularity.

#### Acceptance Criteria

1. THE Crew_Service SHALL display the total attendee count and Crew count on the event page (e.g., "10 going · 2 crews").
2. WHEN public Crews exist for an event, THE Crew_Service SHALL display each public Crew's name, supported languages, and available spots.
3. WHEN only private Crews exist for an event, THE Crew_Service SHALL display only the aggregate Crew count without names or details.
4. WHEN a public Crew has reached its configured capacity, THE Crew_Service SHALL display the Crew as full (e.g., "Artem's crew — 6/6 full").
5. WHEN the "Allow attending as a crew" flag is enabled for an event, THE Crew_Service SHALL display a "Пойти вместе" block with the explanatory text: "Не хотите идти один? Создайте небольшую компанию или присоединитесь к людям, которые уже собираются на это событие."
6. THE Crew_Service SHALL include a description of the Crew feature in the platform FAQ section.

### Requirement 7: Crew Archival

**User Story:** As a platform operator, I want Crews to archive automatically after the event so that the system stays clean while preserving history.

#### Acceptance Criteria

1. WHEN 14 days have passed since the associated event's end time, THE Crew_Service SHALL transition the Crew to archived state.
2. WHILE a Crew is in archived state, THE Crew_Chat SHALL reject new messages and display existing messages as read-only.
3. WHILE a Crew is in archived state, THE Crew_Service SHALL keep the Crew visible in each participant's profile history.
4. THE Crew_Service SHALL NOT delete archived Crews.
5. WHILE a Crew is in archived state, THE Crew_Service SHALL prevent new participants from joining.
6. WHILE a Crew is in archived state, THE Crew_Service SHALL prevent the Crew_Host from deleting the Crew.
7. WHEN the associated event is cancelled (status = 'cancelled'), THE Crew_Service SHALL immediately transition all related active Crews to archived state.

### Requirement 8: Crew Deletion and Departure

**User Story:** As a Crew participant, I want to leave a Crew at any time, and as a Host I want to be able to delete the Crew.

#### Acceptance Criteria

1. THE Crew_Service SHALL allow any participant (Host, Moderator, or Member) to leave a Crew at any time while the Crew is active.
2. WHEN a Crew_Member or Crew_Moderator leaves, THE Crew_Service SHALL remove them from the Crew and revoke Crew_Chat access.
3. WHEN the Crew_Host leaves the Crew and at least one Crew_Moderator remains, THE Crew_Service SHALL promote the longest-standing Crew_Moderator to Crew_Host.
4. WHEN the Crew_Host leaves the Crew and no Crew_Moderators remain, THE Crew_Service SHALL delete the Crew regardless of remaining Crew_Members.
5. WHEN a Crew_Host explicitly deletes the Crew, THE Crew_Service SHALL remove all participants, delete the Crew_Chat, and notify all former participants.
6. WHEN a Crew is deleted (by Host departure or explicit deletion), THE Crew_Service SHALL permanently remove all Crew data including chat history.
7. WHEN a participant leaves a Crew, THE Crew_Service SHALL decrement the participant count and allow new participants to join up to the configured capacity.

### Requirement 9: Organizer Crew Control

**User Story:** As an Event_Organizer, I want to control whether Crews can be created for my event so that I can manage the event experience.

#### Acceptance Criteria

1. THE Crew_Service SHALL always enable the "Allow attending as a crew" flag for System_Events.
2. WHEN an Event_Organizer creates or edits a Community_Event, THE Crew_Service SHALL provide a toggle for the "Allow attending as a crew" flag.
3. WHEN the "Allow attending as a crew" flag is disabled, THE Crew_Service SHALL hide the "Create a Crew" button on the event page.
4. WHEN the "Allow attending as a crew" flag is disabled on an event with existing active Crews, THE Crew_Service SHALL keep existing Crews active but prevent creation of new Crews.

### Requirement 10: Contacts System

**User Story:** As a user, I want to build a contact list from people I've interacted with so that I can easily invite them to future Crews.

#### Acceptance Criteria

1. WHEN a user adds another user from the Interaction_Pool, THE Crew_Service SHALL add that user to the first user's contact list.
2. THE Crew_Service SHALL populate the Interaction_Pool with users who share at least one of the following interactions with the current user: membership in the same Crew, an approved chat conversation, or mutual "going" RSVP on the same event.
3. WHEN a user creates a Crew, THE Crew_Service SHALL present the user's contact list as the primary source for invitations.
4. THE Crew_Service SHALL allow searching the Interaction_Pool during Crew creation even for users not yet added as contacts.
5. WHEN two users become members of the same Crew, THE Crew_Service SHALL add each user to the other's Interaction_Pool upon membership confirmation.
6. WHEN a Crew is deleted, THE Crew_Service SHALL preserve existing Interaction_Pool entries that were created from that Crew's membership (the interaction history persists independently of Crew lifecycle).

### Requirement 11: Notifications

**User Story:** As a user, I want to receive timely notifications about Crew activity so that I can respond to invitations and requests.

#### Acceptance Criteria

1. WHEN a Crew_Invitation is sent, THE Notification_Service SHALL deliver a notification to the invitee within 5 seconds.
2. WHEN a Join_Request is submitted, THE Notification_Service SHALL deliver a notification to the Crew_Host and all Crew_Moderators within 5 seconds.
3. WHEN a Join_Request is accepted or rejected, THE Notification_Service SHALL deliver a notification to the requester within 5 seconds.
4. WHEN a new participant joins the Crew, THE Notification_Service SHALL deliver a notification to all existing Crew participants within 5 seconds.
5. WHEN a participant leaves or is removed from the Crew, THE Notification_Service SHALL deliver a notification to remaining Crew participants within 5 seconds.
6. WHEN a Crew is deleted by the Crew_Host, THE Notification_Service SHALL deliver a notification to all former participants within 5 seconds.

### Requirement 12: Crew Limits and Validation

**User Story:** As a platform operator, I want to enforce capacity and rate limits so that Crews remain small, manageable, and free from abuse.

#### Acceptance Criteria

1. THE Crew_Service SHALL enforce the Crew's configured capacity (between 2 and 10) as the maximum number of participants including the Crew_Host.
2. IF a user attempts to join a Crew that has reached its configured capacity, THEN THE Crew_Service SHALL reject the action and display an error message indicating the Crew is full.
3. IF a user attempts to create a Crew for an event where the user is the Event_Organizer, THEN THE Crew_Service SHALL reject the action.
4. WHEN a participant leaves a Crew, THE Crew_Service SHALL decrement the participant count and allow new participants to join up to the configured capacity.
5. THE Crew_Service SHALL enforce a configurable maximum of active Crews created by a single user (default: 10).
6. THE Crew_Service SHALL enforce a maximum of 20 invitations sent per Crew (including declined and pending invitations).
7. IF a user has already been invited to a specific Crew, THEN THE Crew_Service SHALL prevent sending a duplicate invitation to the same user for the same Crew.
8. IF the target user has blocked the Crew_Host, THEN THE Crew_Service SHALL prevent sending a Crew_Invitation to that user.
9. IF the target user has disabled invitation notifications in their settings, THEN THE Crew_Service SHALL prevent sending a Crew_Invitation to that user.
10. THE Crew_Chat SHALL allow sending messages only to participants with confirmed membership (accepted invitation or approved join request).
11. THE Crew_Service SHALL allow a user to be the Crew_Host of at most one Crew per event.
12. IF a user is already the Crew_Host of a Crew for a specific event, THEN THE Crew_Service SHALL prevent that user from creating another Crew for the same event.
13. THE Crew_Service SHALL allow a user to be a participant (Host, Moderator, or Member) of at most one Crew per event.
14. WHEN a user is accepted into a Crew for an event, THE Crew_Service SHALL automatically cancel all pending Join_Requests from that user to other Crews for the same event.
15. WHILE a user is a participant of a Crew for a specific event, THE Crew_Service SHALL prevent that user from submitting Join_Requests to other Crews for the same event.
