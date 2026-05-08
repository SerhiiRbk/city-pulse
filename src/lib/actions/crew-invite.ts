'use server';

import { randomBytes } from 'node:crypto';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/actions/notifications';
import { prettyZodError } from '@/lib/validations/common';
import {
  MAX_ACTIVE_INVITE_LINKS_PER_CREW,
  INVITE_LINK_EXPIRY_DAYS,
  INVITE_LINK_TOKEN_BYTES,
  MAX_INVITE_LINK_GENERATIONS_PER_24H,
  MAX_INVITATIONS_PER_CREW,
} from '@/lib/constants/crew';
import type { CrewInviteLink } from '@/types/database';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const generateInviteLinkSchema = z.object({
  crew_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// generateInviteLink
// ---------------------------------------------------------------------------

/**
 * Generates a shareable invite link for a crew.
 *
 * Preconditions validated:
 * 1. User is authenticated
 * 2. User is host or moderator of the crew
 * 3. Crew exists and is active (not archived)
 * 4. Crew is not at capacity
 * 5. Associated event has not ended
 * 6. Crew has fewer than 5 active (non-expired, non-revoked) invite links
 * 7. Crew has not exceeded the 20 total invitation limit (standard + invite-link joins)
 * 8. Crew has not exceeded 10 link generations in the rolling 24-hour window
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.12, 1.13, 5.10, 6.1, 6.2, 6.4, 6.5, 6.9
 */
export async function generateInviteLink(
  input: { crew_id: string },
): Promise<{ link?: CrewInviteLink; url?: string; error?: string }> {
  const parsed = generateInviteLinkSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // ------------------------------------------------------------------
  // 2. Validate crew exists and is active
  // ------------------------------------------------------------------
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, event_id, name, capacity, participant_count, status')
    .eq('id', parsed.data.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is archived' };

  // ------------------------------------------------------------------
  // 3. Validate user is host or moderator of the crew
  // ------------------------------------------------------------------
  const isHost = crew.host_id === user.id;
  let isModerator = false;

  if (!isHost) {
    const { data: membership } = await supabase
      .from('event_crew_members')
      .select('role')
      .eq('crew_id', parsed.data.crew_id)
      .eq('user_id', user.id)
      .single();

    isModerator = membership?.role === 'moderator';
  }

  if (!isHost && !isModerator) {
    return { error: 'Only the host or moderators can generate invite links' };
  }

  // ------------------------------------------------------------------
  // 4. Validate crew is not at capacity
  // ------------------------------------------------------------------
  if (crew.participant_count >= crew.capacity) {
    return { error: 'Crew is full' };
  }

  // ------------------------------------------------------------------
  // 5. Validate associated event has not ended
  // ------------------------------------------------------------------
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, starts_at, duration_minutes')
    .eq('id', crew.event_id)
    .single();

  if (eventError || !event) return { error: 'Event not found' };

  const eventEndTime = new Date(
    new Date(event.starts_at).getTime() + event.duration_minutes * 60 * 1000,
  );
  if (new Date() >= eventEndTime) {
    return { error: 'Event has ended' };
  }

  // ------------------------------------------------------------------
  // 6. Enforce max 5 active invite links per crew
  // ------------------------------------------------------------------
  const { count: activeLinksCount } = await supabase
    .from('crew_invite_links')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', parsed.data.crew_id)
    .eq('status', 'active');

  if ((activeLinksCount ?? 0) >= MAX_ACTIVE_INVITE_LINKS_PER_CREW) {
    return { error: 'Maximum number of active invite links reached' };
  }

  // ------------------------------------------------------------------
  // 7. Enforce max 20 total invitation limit (standard + invite-link joins)
  // ------------------------------------------------------------------
  // Count standard invitations
  const { count: standardInvitationCount } = await supabase
    .from('event_crew_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', parsed.data.crew_id);

  // Count invite-link joins for links belonging to this crew
  const { data: crewLinks } = await supabase
    .from('crew_invite_links')
    .select('id')
    .eq('crew_id', parsed.data.crew_id);

  let totalLinkJoins = 0;
  if (crewLinks && crewLinks.length > 0) {
    const linkIds = crewLinks.map((l) => l.id);
    const { count: joinsCount } = await supabase
      .from('crew_invite_link_joins')
      .select('id', { count: 'exact', head: true })
      .in('link_id', linkIds);
    totalLinkJoins = joinsCount ?? 0;
  }

  const totalInvitations = (standardInvitationCount ?? 0) + totalLinkJoins;
  if (totalInvitations >= MAX_INVITATIONS_PER_CREW) {
    return { error: 'Total invitation limit reached' };
  }

  // ------------------------------------------------------------------
  // 8. Enforce rate limit: max 10 link generations per crew per rolling 24h
  // ------------------------------------------------------------------
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: recentGenerations } = await supabase
    .from('crew_invite_links')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', parsed.data.crew_id)
    .gte('created_at', twentyFourHoursAgo);

  if ((recentGenerations ?? 0) >= MAX_INVITE_LINK_GENERATIONS_PER_24H) {
    return { error: 'Rate limit exceeded. Try again later.' };
  }

  // ------------------------------------------------------------------
  // 9. Generate cryptographically random URL-safe token
  // ------------------------------------------------------------------
  const token = randomBytes(INVITE_LINK_TOKEN_BYTES).toString('base64url');

  // ------------------------------------------------------------------
  // 10. Insert record into crew_invite_links
  // ------------------------------------------------------------------
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { data: link, error: insertError } = await supabase
    .from('crew_invite_links')
    .insert({
      crew_id: parsed.data.crew_id,
      created_by: user.id,
      token,
      status: 'active',
      use_count: 0,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !link) {
    return { error: insertError?.message ?? 'Failed to generate invite link' };
  }

  // ------------------------------------------------------------------
  // 11. Return the link record and formatted URL
  // ------------------------------------------------------------------
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = `${baseUrl}/invite/crew/${token}`;

  return { link: link as CrewInviteLink, url };
}

// ---------------------------------------------------------------------------
// Types for invite token validation
// ---------------------------------------------------------------------------

export interface CrewInviteData {
  id: string;
  name: string;
  capacity: number;
  participant_count: number;
  event_id: string;
}

export interface EventInviteData {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  address: string | null;
  city: string | null;
  photos: string[];
}

export interface InviterData {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export type InviteTokenValidationResult =
  | { status: 'valid'; crew: CrewInviteData; event: EventInviteData; inviter: InviterData }
  | { status: 'expired' }
  | { status: 'revoked' }
  | { status: 'crew_deleted' }
  | { status: 'crew_archived' }
  | { status: 'crew_full'; eventId: string }
  | { status: 'event_ended' }
  | { status: 'invalid' }
  | { status: 'already_member'; crewId: string; eventId: string }
  | { status: 'blocked' };

// ---------------------------------------------------------------------------
// validateInviteToken
// ---------------------------------------------------------------------------

/**
 * Validates an invite token and returns the current state of the invitation.
 *
 * Uses the service-role (admin) client so it works for unauthenticated page
 * loads as well — the landing page is public.
 *
 * Validation order:
 * 1. Token exists → if not, return `invalid`
 * 2. Token is not revoked → if revoked, return `revoked`
 * 3. Token is not expired (current time < expires_at) → if expired, return `expired`
 * 4. Crew exists → if not, return `crew_deleted`
 * 5. Crew is active → if archived, return `crew_archived`
 * 6. Event has not ended → if ended, return `event_ended`
 * 7. Crew is not full → if full, return `crew_full`
 * 8. If userId provided: user is not blocked → if blocked, return `blocked`
 * 9. If userId provided: user is not already a member → if member, return `already_member`
 * 10. Return `valid` with crew, event, and inviter data
 *
 * Requirements: 1.9, 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13, 3.14, 3.15
 */
export async function validateInviteToken(
  token: string,
  userId?: string,
): Promise<InviteTokenValidationResult> {
  const supabase = createAdminClient();

  // -------------------------------------------------------------------------
  // 1. Token exists in database
  // -------------------------------------------------------------------------
  const { data: link, error: linkError } = await supabase
    .from('crew_invite_links')
    .select('id, crew_id, created_by, token, status, expires_at')
    .eq('token', token)
    .single();

  if (linkError || !link) {
    return { status: 'invalid' };
  }

  // -------------------------------------------------------------------------
  // 2. Token is not revoked
  // -------------------------------------------------------------------------
  if (link.status === 'revoked') {
    return { status: 'revoked' };
  }

  // Also treat 'deactivated' as revoked (same user-facing behavior)
  if (link.status === 'deactivated') {
    return { status: 'revoked' };
  }

  // -------------------------------------------------------------------------
  // 3. Token is not expired (current time < expires_at)
  // -------------------------------------------------------------------------
  if (link.status === 'expired' || new Date(link.expires_at) <= new Date()) {
    return { status: 'expired' };
  }

  // -------------------------------------------------------------------------
  // 4. Crew exists
  // -------------------------------------------------------------------------
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, name, capacity, participant_count, event_id, status, host_id')
    .eq('id', link.crew_id)
    .single();

  if (crewError || !crew) {
    return { status: 'crew_deleted' };
  }

  // -------------------------------------------------------------------------
  // 5. Crew is active (not archived)
  // -------------------------------------------------------------------------
  if (crew.status !== 'active') {
    return { status: 'crew_archived' };
  }

  // -------------------------------------------------------------------------
  // 6. Event has not ended
  // -------------------------------------------------------------------------
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, starts_at, duration_minutes, address, city, photos')
    .eq('id', crew.event_id)
    .single();

  if (eventError || !event) {
    return { status: 'event_ended' };
  }

  const eventEnd = new Date(
    new Date(event.starts_at).getTime() + event.duration_minutes * 60 * 1000,
  );

  if (eventEnd <= new Date()) {
    return { status: 'event_ended' };
  }

  // -------------------------------------------------------------------------
  // 7. Crew is not full
  // -------------------------------------------------------------------------
  if (crew.participant_count >= crew.capacity) {
    return { status: 'crew_full', eventId: event.id };
  }

  // -------------------------------------------------------------------------
  // 8. If userId provided: user is not blocked
  // -------------------------------------------------------------------------
  if (userId) {
    // Check if user is platform-blocked (Requirement 3.15)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_blocked')
      .eq('id', userId)
      .single();

    if (profile?.is_blocked) {
      return { status: 'blocked' };
    }

    // Check if user has blocked the crew host OR host has blocked user (Requirement 6.6)
    const { data: hostBlock } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(
        `and(blocker_id.eq.${userId},blocked_id.eq.${crew.host_id}),and(blocker_id.eq.${crew.host_id},blocked_id.eq.${userId})`,
      )
      .limit(1);

    if (hostBlock && hostBlock.length > 0) {
      return { status: 'blocked' };
    }

    // Check if user was kicked from this crew (Requirement 4.12)
    const { data: kicked } = await supabase
      .from('crew_kicked_members')
      .select('crew_id')
      .eq('crew_id', crew.id)
      .eq('user_id', userId)
      .single();

    if (kicked) {
      return { status: 'blocked' };
    }
  }

  // -------------------------------------------------------------------------
  // 9. If userId provided: user is not already a member
  // -------------------------------------------------------------------------
  if (userId) {
    const { data: existingMembership } = await supabase
      .from('event_crew_members')
      .select('crew_id')
      .eq('crew_id', crew.id)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      return { status: 'already_member', crewId: crew.id, eventId: event.id };
    }
  }

  // -------------------------------------------------------------------------
  // 10. Return valid with crew, event, and inviter data
  // -------------------------------------------------------------------------
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', link.created_by)
    .single();

  const inviter: InviterData = inviterProfile
    ? {
        id: inviterProfile.id,
        display_name: inviterProfile.display_name,
        avatar_url: inviterProfile.avatar_url,
      }
    : {
        id: link.created_by,
        display_name: 'Unknown',
        avatar_url: null,
      };

  return {
    status: 'valid',
    crew: {
      id: crew.id,
      name: crew.name,
      capacity: crew.capacity,
      participant_count: crew.participant_count,
      event_id: crew.event_id,
    },
    event: {
      id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      duration_minutes: event.duration_minutes,
      address: event.address,
      city: event.city,
      photos: event.photos ?? [],
    },
    inviter,
  };
}

// ---------------------------------------------------------------------------
// revokeInviteLink
// ---------------------------------------------------------------------------

/**
 * Revokes an invite link, marking it as inactive.
 *
 * Authorization:
 * - Host can revoke any link for their crew
 * - Moderator can revoke only links they created themselves
 * - Members and non-participants cannot revoke
 *
 * Requirements: 1.8, 5.2, 5.3, 5.4, 5.8
 */
export async function revokeInviteLink(
  input: { link_id: string },
): Promise<{ success?: boolean; error?: string }> {
  const linkIdSchema = z.object({ link_id: z.string().uuid() });
  const parsed = linkIdSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Fetch the invite link
  const { data: link, error: linkError } = await supabase
    .from('crew_invite_links')
    .select('id, crew_id, created_by, status')
    .eq('id', parsed.data.link_id)
    .single();

  if (linkError || !link) return { error: 'Invite link not found' };
  if (link.status !== 'active') return { error: 'Link is already inactive' };

  // 3. Determine user's role in the crew
  const { data: crew } = await supabase
    .from('event_crews')
    .select('id, host_id')
    .eq('id', link.crew_id)
    .single();

  if (!crew) return { error: 'Crew not found' };

  const isHost = crew.host_id === user.id;
  let isModerator = false;

  if (!isHost) {
    const { data: membership } = await supabase
      .from('event_crew_members')
      .select('role')
      .eq('crew_id', link.crew_id)
      .eq('user_id', user.id)
      .single();

    isModerator = membership?.role === 'moderator';
  }

  // 4. Authorization check
  if (!isHost && !isModerator) {
    return { error: 'Only the host or moderators can revoke invite links' };
  }

  // Moderator can only revoke their own links
  if (isModerator && link.created_by !== user.id) {
    return { error: 'Moderators can only revoke their own invite links' };
  }

  // 5. Revoke the link
  const { error: updateError } = await supabase
    .from('crew_invite_links')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.link_id);

  if (updateError) return { error: updateError.message };

  return { success: true };
}


// ---------------------------------------------------------------------------
// joinViaInviteLink
// ---------------------------------------------------------------------------

/**
 * Allows an authenticated user to join a crew via an invite link token.
 *
 * Re-validates the token at join time to handle race conditions (crew filled,
 * link revoked/expired between page load and confirmation click).
 *
 * On success:
 * 1. Insert into `event_crew_members` with role = 'member'
 * 2. Increment `participant_count` on `event_crews`
 * 3. Increment `use_count` on `crew_invite_links`
 * 4. Insert into `crew_invite_link_joins` audit table
 * 5. Cancel all pending invitations for user for same event
 * 6. Cancel all pending join requests for user for same event
 * 7. Insert system message: "{userName} joined the crew via invite link from {inviterName}."
 * 8. Notify all existing crew members (reuse 'crew_member_joined' type)
 * 9. If crew is now full, deactivate all active invite links for this crew
 * 10. Return crewId and eventId on success
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11,
 *              4.12, 4.13, 6.3, 6.4, 6.8, 6.11, 6.12, 7.1, 7.2
 */
export async function joinViaInviteLink(
  input: { token: string },
): Promise<{ success?: boolean; crewId?: string; eventId?: string; error?: string }> {
  if (!input.token || typeof input.token !== 'string') {
    return { error: 'Invalid token' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // -------------------------------------------------------------------------
  // 1. Authenticate user
  // -------------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // -------------------------------------------------------------------------
  // 2. Re-validate token at join time (not expired, not revoked, not deactivated)
  // -------------------------------------------------------------------------
  const { data: link, error: linkError } = await admin
    .from('crew_invite_links')
    .select('id, crew_id, created_by, token, status, use_count, expires_at')
    .eq('token', input.token)
    .single();

  if (linkError || !link) {
    return { error: 'Invalid invite link' };
  }

  if (link.status === 'revoked') {
    return { error: 'This invite link has been revoked' };
  }

  if (link.status === 'deactivated') {
    return { error: 'This invite link is no longer active' };
  }

  if (link.status === 'expired' || new Date(link.expires_at) <= new Date()) {
    return { error: 'This invite link has expired' };
  }

  // -------------------------------------------------------------------------
  // 3. Validate crew exists and is active
  // -------------------------------------------------------------------------
  const { data: crew, error: crewError } = await admin
    .from('event_crews')
    .select('id, host_id, event_id, name, capacity, participant_count, status')
    .eq('id', link.crew_id)
    .single();

  if (crewError || !crew) {
    return { error: 'Crew not found' };
  }

  if (crew.status !== 'active') {
    return { error: 'Crew is no longer active' };
  }

  // -------------------------------------------------------------------------
  // 4. Validate crew is not full
  // -------------------------------------------------------------------------
  if (crew.participant_count >= crew.capacity) {
    return { error: 'Crew is full' };
  }

  // -------------------------------------------------------------------------
  // 5. Validate event has not ended
  // -------------------------------------------------------------------------
  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, organizer_id, is_system, starts_at, duration_minutes, title')
    .eq('id', crew.event_id)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found' };
  }

  const eventEndTime = new Date(
    new Date(event.starts_at).getTime() + event.duration_minutes * 60 * 1000,
  );
  if (new Date() >= eventEndTime) {
    return { error: 'Event has ended' };
  }

  // -------------------------------------------------------------------------
  // 6. Validate user is not platform-blocked
  // -------------------------------------------------------------------------
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, is_blocked')
    .eq('id', user.id)
    .single();

  if (profile?.is_blocked) {
    return { error: 'Cannot join this crew' };
  }

  // -------------------------------------------------------------------------
  // 7. Validate user is not blocked by/has not blocked the crew host
  // -------------------------------------------------------------------------
  const { data: hostBlock } = await admin
    .from('blocked_users')
    .select('blocker_id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${crew.host_id}),and(blocker_id.eq.${crew.host_id},blocked_id.eq.${user.id})`,
    )
    .limit(1);

  if (hostBlock && hostBlock.length > 0) {
    return { error: 'Cannot join this crew' };
  }

  // -------------------------------------------------------------------------
  // 8. Validate user is not already in another crew for the same event
  // -------------------------------------------------------------------------
  const { data: existingCrewMembership } = await admin
    .from('event_crew_members')
    .select('crew_id, event_crews!inner(event_id)')
    .eq('user_id', user.id)
    .eq('event_crews.event_id', crew.event_id);

  if (existingCrewMembership && existingCrewMembership.length > 0) {
    return { error: 'You are already in a crew for this event' };
  }

  // -------------------------------------------------------------------------
  // 9. Validate user is not the event organizer (for non-system events)
  // -------------------------------------------------------------------------
  if (event.organizer_id === user.id && !event.is_system) {
    return { error: 'Event organizers cannot join crews for their own events' };
  }

  // -------------------------------------------------------------------------
  // 10. Validate user was not kicked from this crew
  // -------------------------------------------------------------------------
  const { data: kicked } = await admin
    .from('crew_kicked_members')
    .select('crew_id')
    .eq('crew_id', crew.id)
    .eq('user_id', user.id)
    .single();

  if (kicked) {
    return { error: 'You cannot join this crew' };
  }

  // -------------------------------------------------------------------------
  // 11. Validate total invitation count < 20
  // -------------------------------------------------------------------------
  const { count: standardInvitationCount } = await admin
    .from('event_crew_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', crew.id);

  const { data: crewLinks } = await admin
    .from('crew_invite_links')
    .select('id')
    .eq('crew_id', crew.id);

  let totalLinkJoins = 0;
  if (crewLinks && crewLinks.length > 0) {
    const linkIds = crewLinks.map((l) => l.id);
    const { count: joinsCount } = await admin
      .from('crew_invite_link_joins')
      .select('id', { count: 'exact', head: true })
      .in('link_id', linkIds);
    totalLinkJoins = joinsCount ?? 0;
  }

  const totalInvitations = (standardInvitationCount ?? 0) + totalLinkJoins;
  if (totalInvitations >= MAX_INVITATIONS_PER_CREW) {
    return { error: 'This crew has reached its invitation limit' };
  }

  // -------------------------------------------------------------------------
  // 12. Insert into event_crew_members with role = 'member'
  // -------------------------------------------------------------------------
  const { error: memberError } = await admin
    .from('event_crew_members')
    .insert({
      crew_id: crew.id,
      user_id: user.id,
      role: 'member',
    });

  if (memberError) return { error: memberError.message };

  // -------------------------------------------------------------------------
  // 13. Increment participant_count on event_crews
  // -------------------------------------------------------------------------
  const { error: countError } = await admin
    .from('event_crews')
    .update({
      participant_count: crew.participant_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', crew.id);

  if (countError) return { error: countError.message };

  // -------------------------------------------------------------------------
  // 14. Increment use_count on crew_invite_links
  // -------------------------------------------------------------------------
  await admin
    .from('crew_invite_links')
    .update({ use_count: link.use_count + 1 })
    .eq('id', link.id);

  // -------------------------------------------------------------------------
  // 15. Insert into crew_invite_link_joins audit table
  // -------------------------------------------------------------------------
  await admin.from('crew_invite_link_joins').insert({
    link_id: link.id,
    user_id: user.id,
  });

  // -------------------------------------------------------------------------
  // 16. Cancel all pending invitations for user for same event
  // -------------------------------------------------------------------------
  const { data: pendingInvitations } = await admin
    .from('event_crew_invitations')
    .select('id, crew_id, event_crews!inner(event_id)')
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .eq('event_crews.event_id', crew.event_id);

  if (pendingInvitations && pendingInvitations.length > 0) {
    const invitationIds = pendingInvitations.map((inv) => inv.id);
    await admin
      .from('event_crew_invitations')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .in('id', invitationIds);
  }

  // -------------------------------------------------------------------------
  // 17. Cancel all pending join requests for user for same event
  // -------------------------------------------------------------------------
  const { data: pendingRequests } = await admin
    .from('event_crew_join_requests')
    .select('id, crew_id, event_crews!inner(event_id)')
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .eq('event_crews.event_id', crew.event_id);

  if (pendingRequests && pendingRequests.length > 0) {
    const requestIds = pendingRequests.map((req) => req.id);
    await admin
      .from('event_crew_join_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .in('id', requestIds);
  }

  // -------------------------------------------------------------------------
  // 18. Insert system message: "{userName} joined the crew via invite link from {inviterName}."
  // -------------------------------------------------------------------------
  const userName = profile?.display_name || 'A member';

  // Get inviter's display name
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', link.created_by)
    .single();

  const inviterName = inviterProfile?.display_name || 'someone';

  await admin.from('event_crew_messages').insert({
    crew_id: crew.id,
    sender_id: null,
    content: `${userName} joined the crew via invite link from ${inviterName}.`,
    is_system: true,
  });

  // -------------------------------------------------------------------------
  // 19. Notify all existing crew members (reuse 'crew_member_joined' type)
  // -------------------------------------------------------------------------
  const { data: existingMembers } = await admin
    .from('event_crew_members')
    .select('user_id')
    .eq('crew_id', crew.id)
    .neq('user_id', user.id);

  if (existingMembers && existingMembers.length > 0) {
    await Promise.all(
      existingMembers.map((member) =>
        createNotification({
          userId: member.user_id,
          type: 'crew_member_joined',
          title: 'New crew member',
          body: `${userName} joined "${crew.name}" via invite link from ${inviterName}.`,
          data: { crew_id: crew.id, event_id: crew.event_id },
        }),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 20. If crew is now full, deactivate all active invite links for this crew
  // -------------------------------------------------------------------------
  const newParticipantCount = crew.participant_count + 1;
  if (newParticipantCount >= crew.capacity) {
    await admin
      .from('crew_invite_links')
      .update({ status: 'deactivated' })
      .eq('crew_id', crew.id)
      .eq('status', 'active');
  }

  // -------------------------------------------------------------------------
  // 21. Return crewId and eventId on success
  // -------------------------------------------------------------------------
  return { success: true, crewId: crew.id, eventId: crew.event_id };
}

// ---------------------------------------------------------------------------
// deactivateInviterLinks
// ---------------------------------------------------------------------------

/**
 * Deactivates all active invite links generated by a specific user for a crew.
 *
 * Called as a side effect when a user leaves or is removed from a crew.
 * Does not throw on failure — logs silently since this is a non-critical
 * side effect that should not block the primary operation.
 *
 * Requirements: 1.14
 */
export async function deactivateInviterLinks(
  crewId: string,
  userId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();

    await admin
      .from('crew_invite_links')
      .update({ status: 'deactivated' })
      .eq('crew_id', crewId)
      .eq('created_by', userId)
      .eq('status', 'active');
  } catch {
    // Silently fail — this is a non-critical side effect
    // called after member removal/departure
  }
}


// ---------------------------------------------------------------------------
// getActiveInviteLinks
// ---------------------------------------------------------------------------

/**
 * Returns all active (non-expired, non-revoked) invite links for a crew.
 * Only accessible by host/moderator.
 *
 * Includes creator profile info (display_name) for each link.
 * Sorted by created_at descending.
 *
 * Requirements: 5.1
 */
export async function getActiveInviteLinks(
  input: { crew_id: string },
): Promise<{ links?: (CrewInviteLink & { creator_name: string })[]; error?: string }> {
  const crewIdSchema = z.object({ crew_id: z.string().uuid() });
  const parsed = crewIdSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate user is host or moderator of the crew
  const { data: crew } = await supabase
    .from('event_crews')
    .select('id, host_id')
    .eq('id', parsed.data.crew_id)
    .single();

  if (!crew) return { error: 'Crew not found' };

  const isHost = crew.host_id === user.id;
  let isModerator = false;

  if (!isHost) {
    const { data: membership } = await supabase
      .from('event_crew_members')
      .select('role')
      .eq('crew_id', parsed.data.crew_id)
      .eq('user_id', user.id)
      .single();

    isModerator = membership?.role === 'moderator';
  }

  if (!isHost && !isModerator) {
    return { error: 'Only the host or moderators can view invite links' };
  }

  // 3. Fetch active links with creator profile info
  const { data: links, error: linksError } = await supabase
    .from('crew_invite_links')
    .select('*, profiles:created_by(display_name)')
    .eq('crew_id', parsed.data.crew_id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (linksError) return { error: linksError.message };

  // Map to include creator_name at the top level
  const enrichedLinks = (links ?? []).map((link) => {
    const { profiles, ...rest } = link as Record<string, unknown>;
    const creatorName =
      (profiles as { display_name?: string } | null)?.display_name ?? 'Unknown';
    return { ...(rest as unknown as CrewInviteLink), creator_name: creatorName };
  });

  return { links: enrichedLinks };
}
