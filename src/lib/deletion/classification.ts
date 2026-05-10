/**
 * Pure logic module for classifying events, crews, and groups
 * during account deletion. No side effects — only categorization.
 */

// ─── Event Classification ────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface ClassifiableEvent {
  id: string;
  status: EventStatus;
  ends_at: string; // ISO timestamp
}

export type EventClassification = 'transfer' | 'delete' | 'retain';

export interface ClassifiedEvent {
  event: ClassifiableEvent;
  classification: EventClassification;
}

export interface EventClassificationResult {
  transfer: ClassifiableEvent[];
  delete: ClassifiableEvent[];
  retain: ClassifiableEvent[];
}

/**
 * Classifies events owned by a user being deleted into three buckets:
 *
 * - **transfer**: future published events (ends_at > now) → transfer organizer_id to system account
 * - **delete**: future draft events (ends_at > now, status = 'draft') → delete entirely
 * - **retain**: past events (ends_at <= now) or cancelled events → keep with original organizer_id
 *
 * @param events - Events where organizer_id = the user being deleted
 * @param now - Current timestamp for comparison
 */
export function classifyEvents(
  events: ClassifiableEvent[],
  now: Date
): EventClassificationResult {
  const result: EventClassificationResult = {
    transfer: [],
    delete: [],
    retain: [],
  };

  for (const event of events) {
    const classification = classifySingleEvent(event, now);
    result[classification].push(event);
  }

  return result;
}

function classifySingleEvent(event: ClassifiableEvent, now: Date): EventClassification {
  const endsAt = new Date(event.ends_at);
  const isFuture = endsAt.getTime() > now.getTime();

  // Cancelled events are always retained regardless of timing
  if (event.status === 'cancelled') {
    return 'retain';
  }

  // Past events (ended) are always retained
  if (!isFuture) {
    return 'retain';
  }

  // Future draft events are deleted
  if (event.status === 'draft') {
    return 'delete';
  }

  // Future published (or completed but somehow still future) events are transferred
  return 'transfer';
}

// ─── Conversation Transition Classification ─────────────────────────────────

export type ConversationStatus = 'active' | 'pending' | 'closed' | 'declined';

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  status: ConversationStatus;
}

export interface ClassifiedConversation {
  conversation: Conversation;
  newStatus: ConversationStatus;
}

/**
 * Determines the expected new status for each conversation when a user is soft-deleted.
 *
 * Rules:
 * - Conversations where the user is participant_1 or participant_2 and status = 'active' → 'closed'
 * - Conversations where the user is participant_1 or participant_2 and status = 'pending' → 'declined'
 * - All other statuses remain unchanged
 *
 * @param conversations - All conversations involving the deleted user
 * @param userId - The ID of the user being deleted
 */
export function classifyConversationTransitions(
  conversations: Conversation[],
  userId: string
): ClassifiedConversation[] {
  return conversations.map((conversation) => {
    const isParticipant =
      conversation.participant_1 === userId || conversation.participant_2 === userId;

    if (!isParticipant) {
      return { conversation, newStatus: conversation.status };
    }

    switch (conversation.status) {
      case 'active':
        return { conversation, newStatus: 'closed' as ConversationStatus };
      case 'pending':
        return { conversation, newStatus: 'declined' as ConversationStatus };
      default:
        return { conversation, newStatus: conversation.status };
    }
  });
}

// ─── Conversation Permission Classification ─────────────────────────────────

/**
 * Determines whether a given action is permitted on a conversation based on its status.
 *
 * Rules:
 * - 'read' is always allowed regardless of status
 * - 'write' is only allowed if status is 'active'
 * - 'delete' is only allowed if status is 'active'
 * - For 'closed', 'pending', or 'declined' statuses, 'write' and 'delete' are blocked
 *
 * @param conversation - Object containing the conversation status
 * @param action - The action to check: 'read', 'write', or 'delete'
 * @returns true if the action is permitted, false otherwise
 */
export function classifyConversationPermissions(
  conversation: { status: ConversationStatus },
  action: 'read' | 'write' | 'delete'
): boolean {
  if (action === 'read') {
    return true;
  }

  // 'write' and 'delete' are only allowed for active conversations
  return conversation.status === 'active';
}

// ─── RSVP Cancellation Classification ───────────────────────────────────────

export type AttendeeStatus = 'going' | 'waitlist' | 'interested' | 'cancelled' | 'not_going';

export interface Attendee {
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  event_starts_at: string; // ISO timestamp
}

export interface ClassifiedAttendee {
  attendee: Attendee;
  shouldCancel: boolean;
}

/** Statuses that are considered "active" and eligible for cancellation */
const CANCELLABLE_STATUSES: AttendeeStatus[] = ['going', 'waitlist', 'interested'];

/**
 * Determines which RSVPs should be cancelled when a user is soft-deleted.
 *
 * Rules:
 * - Only records where status IN ('going', 'waitlist', 'interested') AND event.starts_at > now
 *   SHALL have their status set to 'cancelled'
 * - Past event records SHALL remain unchanged
 * - Records with non-active statuses SHALL remain unchanged
 *
 * @param attendees - All event_attendees records for the deleted user
 * @param now - Current timestamp for comparison
 */
export function classifyRsvpCancellations(
  attendees: Attendee[],
  now: Date
): ClassifiedAttendee[] {
  return attendees.map((attendee) => {
    const eventStartsAt = new Date(attendee.event_starts_at);
    const isFuture = eventStartsAt.getTime() > now.getTime();
    const isActiveStatus = CANCELLABLE_STATUSES.includes(attendee.status);

    return {
      attendee,
      shouldCancel: isFuture && isActiveStatus,
    };
  });
}

// ─── Attendance Anonymization Classification ────────────────────────────────

export type AttendanceAnonymizationAction = 'anonymize' | 'delete';

export interface ClassifiedAttendanceAnonymization {
  attendee: Attendee;
  action: AttendanceAnonymizationAction;
}

/**
 * Determines which attendance records should be anonymized (user_id = NULL)
 * vs deleted during the hard delete process.
 *
 * Rules:
 * - Past events (starts_at <= now): set user_id = NULL (anonymize) — record is retained
 * - Future events (starts_at > now): delete the record (these were already cancelled during soft delete)
 *
 * @param attendees - All event_attendees records for the deleted user
 * @param now - Current timestamp for comparison
 */
export function classifyAttendanceAnonymization(
  attendees: Attendee[],
  now: Date
): ClassifiedAttendanceAnonymization[] {
  return attendees.map((attendee) => {
    const eventStartsAt = new Date(attendee.event_starts_at);
    const isPastOrNow = eventStartsAt.getTime() <= now.getTime();

    return {
      attendee,
      action: isPastOrNow ? 'anonymize' : 'delete',
    };
  });
}

// ─── Crew Succession Classification ─────────────────────────────────────────

export interface CrewMemberInfo {
  user_id: string;
  role: 'host' | 'moderator' | 'member';
  joined_at: string; // ISO timestamp
}

export interface ClassifiableCrew {
  id: string;
  members: CrewMemberInfo[];
}

export type CrewSuccessionAction =
  | { type: 'promote_moderator'; moderator: CrewMemberInfo }
  | { type: 'delete_crew' }
  | { type: 'no_action' };

/**
 * Determines the succession action for a crew when its host is being deleted.
 *
 * Rules:
 * - If at least one moderator exists → promote the moderator with earliest joined_at to host
 * - If no moderators exist → mark crew for deletion
 * - If the user is not the host (just a member/moderator) → no action needed
 *
 * @param crew - Crew with its current members (excluding the user being deleted)
 */
export function classifyCrewSuccession(crew: ClassifiableCrew): CrewSuccessionAction {
  const moderators = crew.members.filter((m) => m.role === 'moderator');

  if (moderators.length > 0) {
    // Promote the moderator with the earliest joined_at
    const earliest = moderators.reduce((prev, curr) =>
      new Date(prev.joined_at).getTime() <= new Date(curr.joined_at).getTime() ? prev : curr
    );
    return { type: 'promote_moderator', moderator: earliest };
  }

  // No moderators — crew must be deleted
  return { type: 'delete_crew' };
}

// ─── Group Succession Classification ────────────────────────────────────────

export interface GroupMemberInfo {
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string; // ISO timestamp
}

export interface ClassifiableGroup {
  id: string;
  members: GroupMemberInfo[];
}

export type GroupSuccessionAction =
  | { type: 'promote_moderator'; moderator: GroupMemberInfo }
  | { type: 'promote_member'; member: GroupMemberInfo }
  | { type: 'block_group' };

/**
 * Determines the succession action for a group when its sole admin is being deleted.
 *
 * Rules (in priority order):
 * - If moderators exist → earliest moderator by joined_at becomes admin
 * - If no moderators but members exist → earliest member by joined_at becomes admin
 * - If no other members exist → group is blocked (is_blocked = true)
 *
 * @param group - Group with its remaining members (excluding the user being deleted)
 */
export function classifyGroupSuccession(group: ClassifiableGroup): GroupSuccessionAction {
  const moderators = group.members.filter((m) => m.role === 'moderator');
  const members = group.members.filter((m) => m.role === 'member');

  if (moderators.length > 0) {
    // Promote the moderator with the earliest joined_at
    const earliest = moderators.reduce((prev, curr) =>
      new Date(prev.joined_at).getTime() <= new Date(curr.joined_at).getTime() ? prev : curr
    );
    return { type: 'promote_moderator', moderator: earliest };
  }

  if (members.length > 0) {
    // Promote the member with the earliest joined_at
    const earliest = members.reduce((prev, curr) =>
      new Date(prev.joined_at).getTime() <= new Date(curr.joined_at).getTime() ? prev : curr
    );
    return { type: 'promote_member', member: earliest };
  }

  // No other members — block the group
  return { type: 'block_group' };
}
