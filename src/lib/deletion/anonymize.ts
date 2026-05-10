/**
 * Pure logic module for anonymizing user profiles and content
 * during hard-delete. No side effects — only data transformation.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Sentinel UUID used to replace deleted user references in content records */
export const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

// ─── Profile Anonymization ───────────────────────────────────────────────────

export interface ProfileRecord {
  id: string;
  display_name: string;
  email: string;
  age: number | null;
  city: string | null;
  country: string | null;
  languages: string[];
  interests: string[];
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string | undefined>;
  created_at: string;
}

export interface AnonymizedProfileRecord {
  id: string;
  display_name: string;
  email: null;
  age: null;
  city: null;
  country: null;
  languages: null;
  interests: null;
  bio: null;
  avatar_url: null;
  social_links: null;
  created_at: string;
}

/**
 * Anonymizes a profile record by setting display_name to "Deleted User",
 * avatar_url to NULL, and all other personal data fields to NULL.
 * Preserves `id` and `created_at`.
 */
export function anonymizeProfile(record: ProfileRecord): AnonymizedProfileRecord {
  return {
    id: record.id,
    display_name: 'Deleted User',
    email: null,
    age: null,
    city: null,
    country: null,
    languages: null,
    interests: null,
    bio: null,
    avatar_url: null,
    social_links: null,
    created_at: record.created_at,
  };
}

// ─── Content Anonymization ───────────────────────────────────────────────────

export type ContentType = 'event_review' | 'message' | 'event_crew_message' | 'group_post_comment';

export interface EventReviewRecord {
  type: 'event_review';
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
}

export interface MessageRecord {
  type: 'message';
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface EventCrewMessageRecord {
  type: 'event_crew_message';
  id: string;
  crew_id: string;
  sender_id: string;
  content: string;
  is_system: false; // Only non-system messages are anonymized
  created_at: string;
}

export interface GroupPostCommentRecord {
  type: 'group_post_comment';
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export type ContentRecord =
  | EventReviewRecord
  | MessageRecord
  | EventCrewMessageRecord
  | GroupPostCommentRecord;

export type AnonymizedContentRecord =
  | Omit<EventReviewRecord, 'user_id'> & { user_id: typeof SENTINEL_UUID }
  | Omit<MessageRecord, 'sender_id'> & { sender_id: typeof SENTINEL_UUID }
  | Omit<EventCrewMessageRecord, 'sender_id'> & { sender_id: typeof SENTINEL_UUID }
  | Omit<GroupPostCommentRecord, 'user_id'> & { user_id: typeof SENTINEL_UUID };

/**
 * Anonymizes a content record by replacing the author/sender reference
 * with the sentinel UUID while preserving all content text and other fields.
 *
 * - event_reviews: replaces user_id with sentinel, preserves content + rating
 * - messages: replaces sender_id with sentinel, preserves content
 * - event_crew_messages (is_system = false): replaces sender_id with sentinel, preserves content
 * - group_post_comments: replaces user_id with sentinel, preserves content
 */
export function anonymizeContent(record: ContentRecord): AnonymizedContentRecord {
  switch (record.type) {
    case 'event_review':
      return {
        ...record,
        user_id: SENTINEL_UUID,
      };
    case 'message':
      return {
        ...record,
        sender_id: SENTINEL_UUID,
      };
    case 'event_crew_message':
      return {
        ...record,
        sender_id: SENTINEL_UUID,
      };
    case 'group_post_comment':
      return {
        ...record,
        user_id: SENTINEL_UUID,
      };
  }
}
