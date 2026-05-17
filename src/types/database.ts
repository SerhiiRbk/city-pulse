export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendeeStatus = 'going' | 'waitlist' | 'cancelled';
export type GroupMemberRole = 'member' | 'moderator' | 'admin';
export type ConversationParticipantStatus = 'pending' | 'approved' | 'blocked';
export type ReportTargetType = 'user' | 'event' | 'group';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  twitch?: string;
  youtube?: string;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  age: number | null;
  hide_age: boolean;
  city: string | null;
  city_id: string | null;
  country: string | null;
  languages: string[];
  interests: string[];
  bio: string | null;
  avatar_url: string | null;
  is_available: boolean;
  is_private: boolean;
  social_links: SocialLinks;
  hide_events: boolean;
  is_blocked: boolean;
  role: 'user' | 'admin' | 'moderator' | 'system';
  /**
   * Timestamp when the user finished the post-signup onboarding
   * wizard (city + interests + languages). NULL means the wizard
   * has not been completed; the layout redirects new users to it.
   */
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Append-only log written by SQL triggers when an admin performs a
 * privileged action (currently only `profile.role_change`). Surface
 * is intentionally generic so we can extend it without another
 * migration when we decide to log block/unblock or feature-flag
 * toggles too.
 */
export interface AdminAuditLogEntry {
  id: string;
  /** Actor profile id; nullable so the row outlives deleted admins. */
  actor_id: string | null;
  actor_email_snapshot: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InterestCategory {
  id: string;
  slug: string;
  sort_order: number;
  translations: Record<string, string>;
  created_at: string;
}

export interface Interest {
  id: string;
  slug: string;
  icon: string | null;
  category_id: string | null;
  translations: Record<string, string>;
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  translations: Record<string, string>;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  /**
   * Rich-text description as a TipTap / ProseMirror JSON document.
   * NULL for legacy events that predate migration 046 — the renderer
   * falls back to `description` (plain text, linkified) in that case.
   * New writes always populate this column; the BEFORE-trigger keeps
   * `description` in sync as the plain-text mirror used by previews,
   * OG snippets, and search.
   */
  description_json: Json | null;
  photos: string[];
  languages: string[];
  is_blocked: boolean;
  category_id: string;
  starts_at: string;
  duration_minutes: number;
  is_online: boolean;
  is_free: boolean;
  price: number | null;
  currency: string | null;
  max_attendees: number | null;
  country: string | null;
  city: string | null;
  city_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  organizer_id: string;
  group_id: string | null;
  is_private: boolean;
  private_token: string | null;
  is_system: boolean;
  source_url: string | null;
  status: EventStatus;
  organizer_is_blocked?: boolean;
  /**
   * Controlled-vocabulary audience guardrails.
   * See migration 050 for the allowed values.
   */
  safety_tags: SafetyTag[];
  /**
   * Whether crews can be created for this event.
   * Always treated as `true` for system events (is_system = true)
   * regardless of stored value. Community event organizers toggle this.
   */
  allow_crews: boolean;
  /**
   * Set when this event is one occurrence of a recurring series.
   * NULL for stand-alone events. See migration 055 for the
   * `event_series` parent row and `series_position`.
   */
  series_id: string | null;
  series_position: number | null;
  /**
   * Locale-keyed title overrides. Format: {"en": "...", "cs": "..."}.
   * Falls back to `title` when the viewer locale has no entry.
   */
  title_translations: Record<string, string>;
  /**
   * Locale-keyed plain-text description overrides.
   * Falls back to `description` when the viewer locale has no entry.
   */
  description_translations: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/**
 * Controlled vocabulary for event-level audience guardrails.
 * Keep this list in sync with the CHECK constraint defined in
 * migration 050_rsvp_privacy_safety_tags.sql.
 */
export const SAFETY_TAGS = [
  'women_only',
  'adults_only',
  'lgbtq_friendly',
  'sober',
  'beginner_friendly',
  'dog_friendly',
  'kid_friendly',
  'outdoor'
] as const;
export type SafetyTag = (typeof SAFETY_TAGS)[number];

export interface EventAttendee {
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  confirmed: boolean;
  confirmed_at: string | null;
  /**
   * When false, this attendance row is hidden from public rosters
   * (avatar/name not exposed). Counts still reflect the row.
   */
  is_visible: boolean;
  /**
   * When the 24h reconfirm prompt was last sent. NULL means we have
   * not asked yet. The pair (`reconfirm_sent_at`, `confirmed_at`)
   * decides whether the user still needs to act.
   */
  reconfirm_sent_at: string | null;
  created_at: string;
}

export interface EventFavorite {
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface EventModerator {
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  /**
   * Rich-text description as a TipTap / ProseMirror JSON document.
   * NULL for legacy groups that predate migration 046 — the renderer
   * falls back to `description` (plain text, linkified) in that case.
   * New writes always populate this column; the BEFORE-trigger keeps
   * `description` in sync as the plain-text mirror used by previews,
   * OG snippets, and search.
   */
  description_json: Json | null;
  cover_url: string | null;
  languages: string[];
  is_blocked: boolean;
  country: string | null;
  city: string | null;
  city_id: string | null;
  created_by: string;
  creator_is_blocked?: boolean;
  created_at: string;
  updated_at: string;
}

export type GroupPostType = 'update' | 'announcement' | 'event_recap';

export interface GroupPost {
  id: string;
  group_id: string;
  slug: string | null;
  author_id: string;
  event_id: string | null;
  type: GroupPostType;
  title: string;
  content: string;
  /**
   * Rich-text body as a TipTap / ProseMirror JSON document. NULL for
   * legacy posts that predate migration 045 — the renderer falls back
   * to `content` (plain text) in that case. New writes always populate
   * this column; the trigger keeps `content` in sync as the plain-text
   * mirror used by previews and SEO.
   */
  content_json: Json | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface GroupPostMedia {
  id: string;
  post_id: string;
  type: 'image';
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface GroupPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  is_approved: boolean;
  quoted_text: string | null;
  quoted_author_name: string | null;
  reply_to_id: string | null;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  status: ConversationParticipantStatus;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  data: Json;
  read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

export interface Badge {
  id: string;
  slug: string;
  translations: Record<string, string>;
  icon: string | null;
  created_at: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
}

export interface UserSubscription {
  subscriber_id: string;
  target_user_id: string;
  created_at: string;
}

export type CrewRole = 'host' | 'moderator' | 'member';
export type CrewVisibility = 'public' | 'private';
export type CrewStatus = 'active' | 'archived';
export type CrewInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type CrewJoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface EventCrew {
  id: string;
  event_id: string;
  host_id: string;
  name: string;
  description: string;
  capacity: number;
  languages: string[];
  visibility: CrewVisibility;
  status: CrewStatus;
  participant_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface EventCrewMember {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
}

export interface EventCrewInvitation {
  id: string;
  crew_id: string;
  inviter_id: string;
  invitee_id: string;
  message: string | null;
  message_is_custom: boolean;
  status: CrewInvitationStatus;
  created_at: string;
  responded_at: string | null;
}

export interface EventCrewJoinRequest {
  id: string;
  crew_id: string;
  requester_id: string;
  message: string | null;
  status: CrewJoinRequestStatus;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
}

export interface EventCrewMessage {
  id: string;
  crew_id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
}

export type CrewInviteLinkStatus = 'active' | 'revoked' | 'expired' | 'deactivated';

export interface CrewInviteLink {
  id: string;
  crew_id: string;
  created_by: string;
  token: string;
  status: CrewInviteLinkStatus;
  use_count: number;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface CrewInviteLinkJoin {
  id: string;
  link_id: string;
  user_id: string;
  joined_at: string;
}

export interface CrewKickedMember {
  crew_id: string;
  user_id: string;
  kicked_at: string;
  kicked_by: string;
}

export interface UserContact {
  owner_id: string;
  contact_id: string;
  created_at: string;
}
