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
  role: 'user' | 'admin' | 'moderator';
  created_at: string;
  updated_at: string;
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
  photos: string[];
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
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  confirmed: boolean;
  confirmed_at: string | null;
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
  cover_url: string | null;
  country: string | null;
  city: string | null;
  city_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type GroupPostType = 'update' | 'announcement' | 'event_recap';

export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  event_id: string | null;
  type: GroupPostType;
  title: string;
  content: string;
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
