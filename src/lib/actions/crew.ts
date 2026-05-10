'use server';

import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/actions/notifications';
import { deactivateInviterLinks } from '@/lib/actions/crew-invite';
import { prettyZodError } from '@/lib/validations/common';
import {
  CREW_NAME_MIN_LENGTH,
  CREW_NAME_MAX_LENGTH,
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_CAPACITY_MIN,
  CREW_CAPACITY_MAX,
  CREW_MESSAGE_MAX_LENGTH,
  CREW_INVITATION_MESSAGE_MAX_LENGTH,
  MAX_INVITATIONS_PER_CREW,
  MAX_ACTIVE_CREWS_PER_USER,
} from '@/lib/constants/crew';
import type { EventCrew, EventCrewInvitation, EventCrewMessage, CrewStatus, CrewRole } from '@/types/database';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createCrewSchema = z.object({
  event_id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(CREW_NAME_MIN_LENGTH)
    .max(CREW_NAME_MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .trim()
    .max(CREW_DESCRIPTION_MAX_LENGTH)
    .optional(),
  capacity: z.number().int().min(CREW_CAPACITY_MIN).max(CREW_CAPACITY_MAX),
  languages: z.array(z.string().min(1)).default([]),
  visibility: z.enum(['public', 'private']),
});

export type CreateCrewInput = z.infer<typeof createCrewSchema>;

// ---------------------------------------------------------------------------
// createCrew
// ---------------------------------------------------------------------------

/**
 * Creates a new Crew for an event.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Event exists and allows crews (allow_crews = true OR is_system = true)
 * 3. User is NOT the event organizer
 * 4. User does not already belong to a crew for this event
 * 5. User has not exceeded MAX_ACTIVE_CREWS_PER_USER
 *
 * On success: inserts crew, adds host as member, posts system message.
 *
 * Requirements: 1.1–1.10, 12.3, 12.5, 12.11, 12.12
 */
export async function createCrew(
  input: CreateCrewInput,
): Promise<{ crew?: EventCrew; error?: string }> {
  const parsed = createCrewSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // ------------------------------------------------------------------
  // 1. Validate event exists and allows crews
  // ------------------------------------------------------------------
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, organizer_id, is_system, allow_crews, title')
    .eq('id', parsed.data.event_id)
    .single();

  if (eventError || !event) return { error: 'Event not found' };

  const ev = event as {
    id: string;
    organizer_id: string;
    is_system: boolean | null;
    allow_crews: boolean;
    title: string;
  };

  // System events always allow crews; community events respect the flag
  if (!ev.is_system && !ev.allow_crews) {
    return { error: 'This event does not allow crews' };
  }

  // ------------------------------------------------------------------
  // 2. User must NOT be the event organizer (except for system events,
  //    where the "organizer" is just the admin who created the listing)
  // ------------------------------------------------------------------
  if (ev.organizer_id === user.id && !ev.is_system) {
    return { error: 'Event organizers cannot create crews for their own events' };
  }

  // ------------------------------------------------------------------
  // 3. User must not already be in a crew for this event
  // ------------------------------------------------------------------
  const { data: existingMembership } = await supabase
    .from('event_crew_members')
    .select('crew_id, event_crews!inner(event_id)')
    .eq('user_id', user.id)
    .eq('event_crews.event_id', parsed.data.event_id)
    .limit(1);

  if (existingMembership && existingMembership.length > 0) {
    return { error: 'You already belong to a crew for this event' };
  }

  // ------------------------------------------------------------------
  // 4. User must not exceed active crew limit
  // ------------------------------------------------------------------
  const { count: activeCrewCount } = await supabase
    .from('event_crews')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('status', 'active');

  if ((activeCrewCount ?? 0) >= MAX_ACTIVE_CREWS_PER_USER) {
    return {
      error: `You cannot create more than ${MAX_ACTIVE_CREWS_PER_USER} active crews`,
    };
  }

  // ------------------------------------------------------------------
  // 5. Determine crew name (default if not provided)
  // ------------------------------------------------------------------
  const crewName =
    parsed.data.name && parsed.data.name.length >= CREW_NAME_MIN_LENGTH
      ? parsed.data.name
      : `Компания на ${ev.title}`;

  // ------------------------------------------------------------------
  // 6. Insert crew
  // ------------------------------------------------------------------
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .insert({
      event_id: parsed.data.event_id,
      host_id: user.id,
      name: crewName,
      description: parsed.data.description ?? '',
      capacity: parsed.data.capacity,
      languages: parsed.data.languages,
      visibility: parsed.data.visibility,
      status: 'active',
      participant_count: 1,
    })
    .select()
    .single();

  if (crewError || !crew) {
    return { error: crewError?.message ?? 'Failed to create crew' };
  }

  // ------------------------------------------------------------------
  // 7. Add creator as host member
  // ------------------------------------------------------------------
  const { error: memberError } = await supabase
    .from('event_crew_members')
    .insert({
      crew_id: crew.id,
      user_id: user.id,
      role: 'host',
    });

  if (memberError) {
    // Rollback: delete the crew if member insertion fails
    await supabase.from('event_crews').delete().eq('id', crew.id);
    return { error: 'Failed to add host as crew member' };
  }

  // ------------------------------------------------------------------
  // 8. Insert system message "Crew created"
  // ------------------------------------------------------------------
  await supabase.from('event_crew_messages').insert({
    crew_id: crew.id,
    sender_id: null,
    content: 'Crew created',
    is_system: true,
  });

  return { crew: crew as EventCrew };
}

// ---------------------------------------------------------------------------
// updateCrew
// ---------------------------------------------------------------------------

const updateCrewSchema = z.object({
  crew_id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(CREW_NAME_MIN_LENGTH)
    .max(CREW_NAME_MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .trim()
    .max(CREW_DESCRIPTION_MAX_LENGTH)
    .optional(),
  capacity: z.number().int().min(CREW_CAPACITY_MIN).max(CREW_CAPACITY_MAX).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export type UpdateCrewInput = z.infer<typeof updateCrewSchema>;

/**
 * Updates a crew's settings. Only the host can perform this action.
 *
 * Allowed fields: name, description, capacity, visibility.
 * Inserts a system message when the description is changed.
 *
 * Requirements: 2.6, 4.10, 5.8
 */
export async function updateCrew(
  input: UpdateCrewInput,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = updateCrewSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists, is active, and user is the host
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, status, description')
    .eq('id', parsed.data.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };
  if (crew.host_id !== user.id) {
    return { error: 'Only the host can update crew settings' };
  }

  // 3. Build update payload (only include provided fields)
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity;
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility;

  // 4. Perform the update
  const { error: updateError } = await supabase
    .from('event_crews')
    .update(updates)
    .eq('id', parsed.data.crew_id);

  if (updateError) return { error: updateError.message };

  // 5. Insert system message if description changed
  if (
    parsed.data.description !== undefined &&
    parsed.data.description !== crew.description
  ) {
    await supabase.from('event_crew_messages').insert({
      crew_id: parsed.data.crew_id,
      sender_id: null,
      content: 'Host updated description of crew.',
      is_system: true,
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteCrew
// ---------------------------------------------------------------------------

/**
 * Deletes a crew. Only the host can delete an active crew.
 * CASCADE will handle members, messages, invitations, and requests.
 * Sends notifications to all former participants (excluding the host).
 *
 * Requirements: 2.6, 8.5, 8.6
 */
export async function deleteCrew({ crew_id }: { crew_id: string }) {
  const supabase = await createClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate the crew exists, is active, and user is the host
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, status, name, event_id')
    .eq('id', crew_id)
    .single();

  if (crewError || !crew) {
    return { error: 'Crew not found' };
  }

  if (crew.host_id !== user.id) {
    return { error: 'Only the host can delete the crew' };
  }

  if (crew.status !== 'active') {
    return { error: 'Only active crews can be deleted' };
  }

  // 3. Get all current members (for notifications) BEFORE deleting
  const { data: members } = await supabase
    .from('event_crew_members')
    .select('user_id')
    .eq('crew_id', crew_id);

  const formerParticipantIds = (members || [])
    .map((m) => m.user_id)
    .filter((id) => id !== user.id);

  // 4. Delete the crew (CASCADE will handle members, messages, invitations, requests)
  const { error: deleteError } = await supabase
    .from('event_crews')
    .delete()
    .eq('id', crew_id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // 5. Send notifications to all former participants (excluding the host)
  await Promise.all(
    formerParticipantIds.map((participantId) =>
      createNotification({
        userId: participantId,
        type: 'crew_deleted',
        title: 'Crew deleted',
        body: `The crew "${crew.name}" has been deleted by the host.`,
        data: { crew_id: crew.id, event_id: crew.event_id },
      }),
    ),
  );

  // 6. Return success
  return { success: true };
}

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

/**
 * Removes a member from a crew. Only the crew host can perform this action.
 * The target user cannot be the host themselves (use leaveCrew/deleteCrew instead).
 *
 * Steps:
 * 1. Authenticate the current user
 * 2. Validate the crew exists and the current user is the host
 * 3. Validate the target user is a member (and not the host)
 * 4. Remove the target from event_crew_members
 * 5. Decrement participant_count on event_crews
 * 6. Insert system message: "{UserName} was removed from the crew."
 * 7. Notify the removed user (type = 'crew_member_left')
 * 8. Return success or error
 *
 * Requirements: 2.5, 8.7
 */
export async function removeMember(input: { crew_id: string; user_id: string }) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists and current user is the host
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, event_id, name, participant_count, status')
    .eq('id', input.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };
  if (crew.host_id !== user.id) return { error: 'Only the host can remove members' };

  // 3. Validate target user is a member and is NOT the host
  if (input.user_id === crew.host_id) {
    return { error: 'Cannot remove the host from the crew' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('crew_id, user_id, role')
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id)
    .single();

  if (memberError || !membership) {
    return { error: 'User is not a member of this crew' };
  }

  // Get the target user's display name for the system message
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', input.user_id)
    .single();

  const targetName = targetProfile?.display_name || 'A member';

  // 4. Remove the target from event_crew_members
  const { error: deleteError } = await supabase
    .from('event_crew_members')
    .delete()
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id);

  if (deleteError) return { error: deleteError.message };

  // 5. Decrement participant_count on event_crews
  const { error: updateError } = await supabase
    .from('event_crews')
    .update({
      participant_count: crew.participant_count - 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.crew_id);

  if (updateError) return { error: updateError.message };

  // 6. Insert system message: "{UserName} was removed from the crew."
  await supabase.from('event_crew_messages').insert({
    crew_id: input.crew_id,
    sender_id: null,
    content: `${targetName} was removed from the crew.`,
    is_system: true,
  });

  // 7. Notify the removed user (type = 'crew_member_left')
  await createNotification({
    userId: input.user_id,
    type: 'crew_member_left',
    title: `You were removed from "${crew.name}"`,
    body: `The host removed you from the crew.`,
    data: { crew_id: input.crew_id, event_id: crew.event_id },
  });

  // 8. Deactivate invite links generated by the removed user
  await deactivateInviterLinks(input.crew_id, input.user_id);

  // 9. Record the kick in crew_kicked_members so the user cannot rejoin via invite link
  const admin = createAdminClient();
  await admin.from('crew_kicked_members').upsert(
    {
      crew_id: input.crew_id,
      user_id: input.user_id,
      kicked_at: new Date().toISOString(),
      kicked_by: user.id,
    },
    { onConflict: 'crew_id,user_id' },
  );

  // 10. Return success
  return { success: true };
}

// ---------------------------------------------------------------------------
// leaveCrew
// ---------------------------------------------------------------------------

/**
 * Allows any participant (Host, Moderator, or Member) to leave a crew.
 *
 * Three cases:
 * 1. Host leaves + moderators exist → promote longest-standing moderator to host
 * 2. Host leaves + no moderators → delete crew, notify all former members
 * 3. Member/Moderator leaves → remove from members, decrement participant_count
 *
 * Requirements: 8.1–8.4, 8.7
 */
export async function leaveCrew({ crew_id }: { crew_id: string }) {
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate the crew exists and is active
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, status, name, event_id')
    .eq('id', crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Cannot leave an archived crew' };

  // 3. Validate the user is a member of this crew
  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('user_id, role')
    .eq('crew_id', crew_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) return { error: 'You are not a member of this crew' };

  // Get the leaving user's display name for system messages
  const { data: leavingProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const leavingName = leavingProfile?.display_name || 'A member';

  const isHost = crew.host_id === user.id;

  // --- Case 1: Host leaves AND moderators exist ---
  if (isHost) {
    // Find moderators ordered by joined_at (longest-standing first)
    const { data: moderators } = await supabase
      .from('event_crew_members')
      .select('user_id, joined_at')
      .eq('crew_id', crew_id)
      .eq('role', 'moderator')
      .order('joined_at', { ascending: true })
      .limit(1);

    if (moderators && moderators.length > 0) {
      const newHostId = moderators[0].user_id;

      // Get new host's display name for system message
      const { data: newHostProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', newHostId)
        .single();

      const newHostName = newHostProfile?.display_name || 'A member';

      // Update crew host_id
      const { error: updateHostError } = await supabase
        .from('event_crews')
        .update({ host_id: newHostId, updated_at: new Date().toISOString() })
        .eq('id', crew_id);

      if (updateHostError) return { error: updateHostError.message };

      // Update the moderator's role to 'host'
      const { error: promoteError } = await supabase
        .from('event_crew_members')
        .update({ role: 'host' })
        .eq('crew_id', crew_id)
        .eq('user_id', newHostId);

      if (promoteError) return { error: promoteError.message };

      // Remove the old host from members
      const { error: removeError } = await supabase
        .from('event_crew_members')
        .delete()
        .eq('crew_id', crew_id)
        .eq('user_id', user.id);

      if (removeError) return { error: removeError.message };

      // Decrement participant_count (fetch current value then update)
      const { data: currentCrew } = await supabase
        .from('event_crews')
        .select('participant_count')
        .eq('id', crew_id)
        .single();

      if (currentCrew) {
        await supabase
          .from('event_crews')
          .update({
            participant_count: currentCrew.participant_count - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', crew_id);
      }

      // Insert system message
      await supabase.from('event_crew_messages').insert({
        crew_id,
        sender_id: null,
        content: `${leavingName} left. ${newHostName} is now the host.`,
        is_system: true,
      });

      // Notify remaining members
      const { data: remainingMembers } = await supabase
        .from('event_crew_members')
        .select('user_id')
        .eq('crew_id', crew_id);

      await Promise.all(
        (remainingMembers || [])
          .filter((m) => m.user_id !== user.id)
          .map((m) =>
            createNotification({
              userId: m.user_id,
              type: 'crew_member_left',
              title: 'Member left crew',
              body: `${leavingName} left the crew "${crew.name}". ${newHostName} is now the host.`,
              data: { crew_id: crew.id, event_id: crew.event_id },
            }),
          ),
      );

      // Deactivate invite links generated by the departing host
      await deactivateInviterLinks(crew_id, user.id);

      return { success: true };
    }

    // --- Case 2: Host leaves AND no moderators ---
    // Get all members for notifications BEFORE deleting
    const { data: allMembers } = await supabase
      .from('event_crew_members')
      .select('user_id')
      .eq('crew_id', crew_id);

    const formerParticipantIds = (allMembers || [])
      .map((m) => m.user_id)
      .filter((id) => id !== user.id);

    // Deactivate invite links generated by the departing host before crew deletion
    await deactivateInviterLinks(crew_id, user.id);

    // Delete the crew (CASCADE handles cleanup)
    const { error: deleteError } = await supabase
      .from('event_crews')
      .delete()
      .eq('id', crew_id);

    if (deleteError) return { error: deleteError.message };

    // Notify all former members
    await Promise.all(
      formerParticipantIds.map((participantId) =>
        createNotification({
          userId: participantId,
          type: 'crew_deleted',
          title: 'Crew deleted',
          body: `The crew "${crew.name}" has been deleted because the host left.`,
          data: { crew_id: crew.id, event_id: crew.event_id },
        }),
      ),
    );

    return { success: true };
  }

  // --- Case 3: Member or Moderator leaves ---
  // Remove from event_crew_members
  const { error: removeError } = await supabase
    .from('event_crew_members')
    .delete()
    .eq('crew_id', crew_id)
    .eq('user_id', user.id);

  if (removeError) return { error: removeError.message };

  // Decrement participant_count
  const { data: currentCrew } = await supabase
    .from('event_crews')
    .select('participant_count')
    .eq('id', crew_id)
    .single();

  if (currentCrew) {
    await supabase
      .from('event_crews')
      .update({
        participant_count: currentCrew.participant_count - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', crew_id);
  }

  // Insert system message
  await supabase.from('event_crew_messages').insert({
    crew_id,
    sender_id: null,
    content: `${leavingName} left the crew.`,
    is_system: true,
  });

  // Notify remaining members
  const { data: remainingMembers } = await supabase
    .from('event_crew_members')
    .select('user_id')
    .eq('crew_id', crew_id);

  await Promise.all(
    (remainingMembers || []).map((m) =>
      createNotification({
        userId: m.user_id,
        type: 'crew_member_left',
        title: 'Member left crew',
        body: `${leavingName} left the crew "${crew.name}".`,
        data: { crew_id: crew.id, event_id: crew.event_id },
      }),
    ),
  );

  // Deactivate invite links generated by the departing member/moderator
  await deactivateInviterLinks(crew_id, user.id);

  return { success: true };
}

// ---------------------------------------------------------------------------
// respondToInvitation
// ---------------------------------------------------------------------------

const respondToInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  accept: z.boolean(),
});

/**
 * Allows an invitee to accept or decline a Crew invitation.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Invitation exists and user is the invitee
 * 3. Invitation status is 'pending'
 * 4. If accepting: crew is not full (participant_count < capacity)
 *
 * On decline: mark invitation as 'declined', set responded_at.
 *
 * On accept:
 * - Update invitation status to 'accepted', set responded_at
 * - Insert into event_crew_members with role = 'member'
 * - Increment participant_count on event_crews
 * - Cancel all other pending invitations for this user for the same event
 * - Cancel all pending join_requests for this user for the same event
 * - Insert system message "{UserName} joined the crew."
 * - Notify all existing crew members (type = 'crew_member_joined')
 *
 * Requirements: 3.6, 3.7, 3.11, 12.14
 */
export async function respondToInvitation(
  input: z.infer<typeof respondToInvitationSchema>,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = respondToInvitationSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate invitation exists and user is the invitee
  const { data: invitation, error: invError } = await supabase
    .from('event_crew_invitations')
    .select('id, crew_id, invitee_id, status')
    .eq('id', parsed.data.invitation_id)
    .single();

  if (invError || !invitation) return { error: 'Invitation not found' };
  if (invitation.invitee_id !== user.id) {
    return { error: 'You are not the invitee of this invitation' };
  }

  // 3. Validate invitation status is 'pending'
  if (invitation.status !== 'pending') {
    return { error: 'This invitation is no longer pending' };
  }

  // 4. If declining: update status to 'declined', set responded_at
  if (!parsed.data.accept) {
    const { error: declineError } = await supabase
      .from('event_crew_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.invitation_id);

    if (declineError) return { error: declineError.message };
    return { success: true };
  }

  // --- Accepting the invitation ---

  // 5a. Fetch crew details to validate capacity
  // Use admin client because the invitee is not yet a member (RLS would block)
  const admin = createAdminClient();
  const { data: crew, error: crewError } = await admin
    .from('event_crews')
    .select('id, event_id, name, capacity, participant_count, status')
    .eq('id', invitation.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is no longer active' };

  if (crew.participant_count >= crew.capacity) {
    return { error: 'Crew is full' };
  }

  // 5b. Update invitation status to 'accepted'
  const { error: acceptError } = await supabase
    .from('event_crew_invitations')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.invitation_id);

  if (acceptError) return { error: acceptError.message };

  // 5c. Insert into event_crew_members with role = 'member'
  const { error: memberError } = await supabase
    .from('event_crew_members')
    .insert({
      crew_id: crew.id,
      user_id: user.id,
      role: 'member',
    });

  if (memberError) return { error: memberError.message };

  // 5d. Increment participant_count on event_crews
  const { error: countError } = await supabase
    .from('event_crews')
    .update({
      participant_count: crew.participant_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', crew.id);

  if (countError) return { error: countError.message };

  // 5e. Cancel all other pending invitations for this user for the same event
  const { data: otherInvitations } = await supabase
    .from('event_crew_invitations')
    .select('id, crew_id, event_crews!inner(event_id)')
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .eq('event_crews.event_id', crew.event_id)
    .neq('id', parsed.data.invitation_id);

  if (otherInvitations && otherInvitations.length > 0) {
    const otherIds = otherInvitations.map((inv) => inv.id);
    await supabase
      .from('event_crew_invitations')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .in('id', otherIds);
  }

  // 5f. Cancel all pending join_requests for this user for the same event
  const { data: pendingRequests } = await supabase
    .from('event_crew_join_requests')
    .select('id, crew_id, event_crews!inner(event_id)')
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .eq('event_crews.event_id', crew.event_id);

  if (pendingRequests && pendingRequests.length > 0) {
    const requestIds = pendingRequests.map((req) => req.id);
    await supabase
      .from('event_crew_join_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .in('id', requestIds);
  }

  // Get the user's display name for system message
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.display_name || 'A member';

  // 5g. Insert system message "{UserName} joined the crew."
  await supabase.from('event_crew_messages').insert({
    crew_id: crew.id,
    sender_id: null,
    content: `${userName} joined the crew.`,
    is_system: true,
  });

  // 5h. Notify all existing crew members (type = 'crew_member_joined')
  const { data: existingMembers } = await supabase
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
          body: `${userName} joined the crew "${crew.name}".`,
          data: { crew_id: crew.id, event_id: crew.event_id },
        }),
      ),
    );
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// respondToJoinRequest
// ---------------------------------------------------------------------------

/**
 * Allows a Crew host or moderator to accept or reject a pending join request.
 *
 * If rejecting:
 *   - Update status to 'rejected', set responded_at and responded_by
 *   - Notify requester (type = 'crew_join_rejected')
 *
 * If accepting:
 *   - Validate crew is not full
 *   - Update request status to 'accepted', set responded_at and responded_by
 *   - Insert into event_crew_members with role = 'member'
 *   - Increment participant_count
 *   - Cancel all other pending join_requests from this user for the same event
 *   - Cancel all pending invitations for this user for the same event
 *   - Insert system message "{UserName} joined the crew."
 *   - Notify requester (type = 'crew_join_accepted')
 *   - Notify all existing crew members (type = 'crew_member_joined')
 *
 * Requirements: 4.7, 4.8, 12.14
 */
export async function respondToJoinRequest(input: {
  request_id: string;
  accept: boolean;
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate request exists and status is 'pending'
  const { data: request, error: requestError } = await supabase
    .from('event_crew_join_requests')
    .select('id, crew_id, requester_id, status')
    .eq('id', input.request_id)
    .single();

  if (requestError || !request) return { error: 'Join request not found' };
  if (request.status !== 'pending') return { error: 'Join request is no longer pending' };

  // 3. Validate user is host or moderator of the crew
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, event_id, name, capacity, participant_count, status')
    .eq('id', request.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };

  const isHost = crew.host_id === user.id;

  let isModerator = false;
  if (!isHost) {
    const { data: membership } = await supabase
      .from('event_crew_members')
      .select('role')
      .eq('crew_id', crew.id)
      .eq('user_id', user.id)
      .single();

    isModerator = membership?.role === 'moderator';
  }

  if (!isHost && !isModerator) {
    return { error: 'Only the host or a moderator can respond to join requests' };
  }

  // 4. If rejecting
  if (!input.accept) {
    // Update status to 'rejected'
    const { error: updateError } = await supabase
      .from('event_crew_join_requests')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq('id', input.request_id);

    if (updateError) return { error: updateError.message };

    // Notify requester
    await createNotification({
      userId: request.requester_id,
      type: 'crew_join_rejected',
      title: 'Join request declined',
      body: `Your request to join "${crew.name}" was declined.`,
      data: { crew_id: crew.id, event_id: crew.event_id },
    });

    return { success: true };
  }

  // 5. If accepting — validate crew is not full
  if (crew.participant_count >= crew.capacity) {
    return { error: 'Crew is full' };
  }

  // 5b. Update request status to 'accepted'
  const { error: acceptError } = await supabase
    .from('event_crew_join_requests')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      responded_by: user.id,
    })
    .eq('id', input.request_id);

  if (acceptError) return { error: acceptError.message };

  // 5c. Insert into event_crew_members with role = 'member'
  const { error: memberError } = await supabase
    .from('event_crew_members')
    .insert({
      crew_id: crew.id,
      user_id: request.requester_id,
      role: 'member',
    });

  if (memberError) return { error: memberError.message };

  // 5d. Increment participant_count
  const { error: countError } = await supabase
    .from('event_crews')
    .update({
      participant_count: crew.participant_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', crew.id);

  if (countError) return { error: countError.message };

  // 5e. Cancel all other pending join_requests from this user for the same event
  const { data: otherCrews } = await supabase
    .from('event_crews')
    .select('id')
    .eq('event_id', crew.event_id)
    .neq('id', crew.id);

  if (otherCrews && otherCrews.length > 0) {
    const otherCrewIds = otherCrews.map((c) => c.id);
    await supabase
      .from('event_crew_join_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .eq('requester_id', request.requester_id)
      .eq('status', 'pending')
      .in('crew_id', otherCrewIds);
  }

  // 5f. Cancel all pending invitations for this user for the same event
  if (otherCrews && otherCrews.length > 0) {
    const otherCrewIds = otherCrews.map((c) => c.id);
    await supabase
      .from('event_crew_invitations')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      })
      .eq('invitee_id', request.requester_id)
      .eq('status', 'pending')
      .in('crew_id', otherCrewIds);
  }

  // Also cancel pending invitations for this user in the SAME crew
  await supabase
    .from('event_crew_invitations')
    .update({
      status: 'cancelled',
      responded_at: new Date().toISOString(),
    })
    .eq('invitee_id', request.requester_id)
    .eq('status', 'pending')
    .eq('crew_id', crew.id);

  // 5g. Get requester's display name for system message
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', request.requester_id)
    .single();

  const requesterName = requesterProfile?.display_name || 'A member';

  // Insert system message "{UserName} joined the crew."
  await supabase.from('event_crew_messages').insert({
    crew_id: crew.id,
    sender_id: null,
    content: `${requesterName} joined the crew.`,
    is_system: true,
  });

  // 5h. Notify requester (type = 'crew_join_accepted')
  await createNotification({
    userId: request.requester_id,
    type: 'crew_join_accepted',
    title: 'Join request accepted',
    body: `Your request to join "${crew.name}" was accepted!`,
    data: { crew_id: crew.id, event_id: crew.event_id },
  });

  // 5i. Notify all existing crew members (type = 'crew_member_joined')
  const { data: existingMembers } = await supabase
    .from('event_crew_members')
    .select('user_id')
    .eq('crew_id', crew.id);

  await Promise.all(
    (existingMembers || [])
      .filter((m) => m.user_id !== request.requester_id)
      .map((m) =>
        createNotification({
          userId: m.user_id,
          type: 'crew_member_joined',
          title: 'New crew member',
          body: `${requesterName} joined "${crew.name}".`,
          data: { crew_id: crew.id, event_id: crew.event_id },
        }),
      ),
  );

  return { success: true };
}

// ---------------------------------------------------------------------------
// promoteModerator
// ---------------------------------------------------------------------------

/**
 * Promotes a Crew member to Moderator. Only the Crew host can perform this.
 *
 * Steps:
 * 1. Authenticate the current user
 * 2. Validate the crew exists, is active, and the current user is the host
 * 3. Validate the target user is a member with role = 'member'
 * 4. Update the target's role to 'moderator'
 * 5. Return success or error
 *
 * Requirements: 2.2, 2.4
 */
export async function promoteModerator(input: {
  crew_id: string;
  user_id: string;
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists, is active, and current user is the host
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, status')
    .eq('id', input.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };
  if (crew.host_id !== user.id) {
    return { error: 'Only the host can promote members to moderator' };
  }

  // 3. Validate target user is a member with role = 'member'
  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('crew_id, user_id, role')
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id)
    .single();

  if (memberError || !membership) {
    return { error: 'User is not a member of this crew' };
  }

  if (membership.role !== 'member') {
    return { error: 'User is not a regular member (already has a different role)' };
  }

  // 4. Update target's role to 'moderator'
  const { error: updateError } = await supabase
    .from('event_crew_members')
    .update({ role: 'moderator' })
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id);

  if (updateError) return { error: updateError.message };

  return { success: true };
}

// ---------------------------------------------------------------------------
// demoteModerator
// ---------------------------------------------------------------------------

/**
 * Demotes a Crew moderator back to regular member. Only the Crew host can perform this.
 *
 * Steps:
 * 1. Authenticate the current user
 * 2. Validate the crew exists, is active, and the current user is the host
 * 3. Validate the target user is a member with role = 'moderator'
 * 4. Update the target's role back to 'member'
 * 5. Return success or error
 *
 * Requirements: 2.3, 2.4
 */
export async function demoteModerator(input: {
  crew_id: string;
  user_id: string;
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists, is active, and current user is the host
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id, status')
    .eq('id', input.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };
  if (crew.host_id !== user.id) {
    return { error: 'Only the host can demote moderators' };
  }

  // 3. Validate target user is a member with role = 'moderator'
  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('crew_id, user_id, role')
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id)
    .single();

  if (memberError || !membership) {
    return { error: 'User is not a member of this crew' };
  }

  if (membership.role !== 'moderator') {
    return { error: 'User is not a moderator' };
  }

  // 4. Update target's role back to 'member'
  const { error: updateError } = await supabase
    .from('event_crew_members')
    .update({ role: 'member' })
    .eq('crew_id', input.crew_id)
    .eq('user_id', input.user_id);

  if (updateError) return { error: updateError.message };

  return { success: true };
}

// ---------------------------------------------------------------------------
// getJoinRequestsForCrew
// ---------------------------------------------------------------------------

/**
 * Returns all pending join requests for a crew.
 * Only the crew host or moderators can view these.
 *
 * Steps:
 * 1. Authenticate the current user
 * 2. Validate the crew exists
 * 3. Validate the current user is host or moderator of the crew
 * 4. Query pending join requests with requester profile info
 * 5. Order by created_at ascending (oldest first)
 *
 * Requirements: 2.8
 */
export async function getJoinRequestsForCrew(input: { crew_id: string }) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, host_id')
    .eq('id', input.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };

  // 3. Validate user is host or moderator
  const isHost = crew.host_id === user.id;

  if (!isHost) {
    const { data: membership, error: memberError } = await supabase
      .from('event_crew_members')
      .select('role')
      .eq('crew_id', input.crew_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership || membership.role !== 'moderator') {
      return { error: 'Only the host or moderators can view join requests' };
    }
  }

  // 4. Query pending join requests with requester profile info
  const { data: requests, error: requestsError } = await supabase
    .from('event_crew_join_requests')
    .select(
      `
      id,
      crew_id,
      requester_id,
      message,
      status,
      created_at,
      profiles!event_crew_join_requests_requester_id_fkey (
        display_name,
        avatar_url
      )
    `,
    )
    .eq('crew_id', input.crew_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (requestsError) return { error: requestsError.message };

  return { requests: requests ?? [] };
}

// ---------------------------------------------------------------------------
// getMyPendingInvitations
// ---------------------------------------------------------------------------

/**
 * Returns all pending crew invitations for the current authenticated user,
 * enriched with crew name, event title, and inviter display name.
 *
 * Requirements: 11.1
 */
export interface PendingInvitationWithDetails {
  id: string;
  crew_id: string;
  inviter_id: string;
  invitee_id: string;
  message: string | null;
  message_is_custom: boolean;
  status: string;
  created_at: string;
  responded_at: string | null;
  crew_name: string;
  event_id: string;
  event_title: string;
  inviter_name: string;
}

export async function getMyPendingInvitations(): Promise<{
  invitations?: PendingInvitationWithDetails[];
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Query pending invitations with joined crew, event, and inviter details
  // NOTE: We use the admin client here because the invitee is NOT yet a member
  // of the crew, so RLS on event_crews would block the join.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('event_crew_invitations')
    .select(
      `
      id,
      crew_id,
      inviter_id,
      invitee_id,
      message,
      message_is_custom,
      status,
      created_at,
      responded_at,
      event_crews!inner (
        name,
        event_id,
        events!inner (
          title
        )
      ),
      profiles!event_crew_invitations_inviter_id_fkey (
        display_name
      )
    `,
    )
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  // 3. Map the joined data into a flat structure
  const invitations: PendingInvitationWithDetails[] = (data || []).map(
    (row: any) => ({
      id: row.id,
      crew_id: row.crew_id,
      inviter_id: row.inviter_id,
      invitee_id: row.invitee_id,
      message: row.message,
      message_is_custom: row.message_is_custom,
      status: row.status,
      created_at: row.created_at,
      responded_at: row.responded_at,
      crew_name: row.event_crews?.name ?? '',
      event_id: row.event_crews?.event_id ?? '',
      event_title: row.event_crews?.events?.title ?? '',
      inviter_name: row.profiles?.display_name ?? '',
    }),
  );

  return { invitations };
}

// ---------------------------------------------------------------------------
// submitJoinRequest
// ---------------------------------------------------------------------------

const submitJoinRequestSchema = z.object({
  crew_id: z.string().uuid(),
  message: z
    .string()
    .trim()
    .max(CREW_INVITATION_MESSAGE_MAX_LENGTH)
    .optional(),
});

export type SubmitJoinRequestInput = z.infer<typeof submitJoinRequestSchema>;

/**
 * Submits a join request to a public crew.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Crew exists, is active, and is public (visibility = 'public')
 * 3. Crew is not full (participant_count < capacity)
 * 4. User is not already in a crew for this event
 * 5. No duplicate pending request exists for this crew + user
 * 6. Message length validated (max 300 chars) via schema
 *
 * On success: inserts into event_crew_join_requests, notifies host and moderators.
 *
 * Requirements: 4.5, 4.6, 12.13, 12.15
 */
export async function submitJoinRequest(
  input: SubmitJoinRequestInput,
): Promise<{ request?: Record<string, unknown>; error?: string }> {
  const parsed = submitJoinRequestSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists, is active, and is public
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, event_id, host_id, name, visibility, status, capacity, participant_count')
    .eq('id', parsed.data.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') return { error: 'Crew is not active' };
  if (crew.visibility !== 'public') {
    return { error: 'Join requests are only available for public crews' };
  }

  // 3. Validate crew is not full
  if (crew.participant_count >= crew.capacity) {
    return { error: 'This crew is full' };
  }

  // 4. Validate user is not already in a crew for this event
  const { data: existingMembership } = await supabase
    .from('event_crew_members')
    .select('crew_id, event_crews!inner(event_id)')
    .eq('user_id', user.id)
    .eq('event_crews.event_id', crew.event_id)
    .limit(1);

  if (existingMembership && existingMembership.length > 0) {
    return { error: 'You already belong to a crew for this event' };
  }

  // 5. Validate no duplicate pending request exists for this crew + user
  const { data: existingRequest } = await supabase
    .from('event_crew_join_requests')
    .select('id')
    .eq('crew_id', parsed.data.crew_id)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .limit(1);

  if (existingRequest && existingRequest.length > 0) {
    return { error: 'You already have a pending join request for this crew' };
  }

  // 6. Insert into event_crew_join_requests
  const { data: request, error: insertError } = await supabase
    .from('event_crew_join_requests')
    .insert({
      crew_id: parsed.data.crew_id,
      requester_id: user.id,
      message: parsed.data.message || null,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !request) {
    return { error: insertError?.message ?? 'Failed to submit join request' };
  }

  // 7. Notify host and all moderators (type = 'crew_join_request')
  // Get host + moderators for this crew
  const { data: crewManagers } = await supabase
    .from('event_crew_members')
    .select('user_id, role')
    .eq('crew_id', parsed.data.crew_id)
    .in('role', ['host', 'moderator']);

  // Get requester's display name for notification body
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const requesterName = requesterProfile?.display_name || 'Someone';

  await Promise.all(
    (crewManagers || []).map((manager) =>
      createNotification({
        userId: manager.user_id,
        type: 'crew_join_request',
        title: 'New join request',
        body: `${requesterName} wants to join "${crew.name}".`,
        data: {
          crew_id: crew.id,
          event_id: crew.event_id,
          request_id: request.id,
          requester_id: user.id,
        },
      }),
    ),
  );

  return { request };
}

// ---------------------------------------------------------------------------
// sendCrewInvitation
// ---------------------------------------------------------------------------

const sendCrewInvitationSchema = z.object({
  crew_id: z.string().uuid(),
  invitee_id: z.string().uuid(),
  message: z
    .string()
    .trim()
    .max(CREW_INVITATION_MESSAGE_MAX_LENGTH)
    .optional(),
});

export type SendCrewInvitationInput = z.infer<typeof sendCrewInvitationSchema>;

/**
 * Sends a Crew invitation to a user.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Crew exists and is active
 * 3. User is host or moderator of the crew
 * 4. Crew is not full (participant_count < capacity)
 * 5. Invitee has not blocked the host
 * 6. Invitee is not already in a crew for this event
 * 7. No duplicate pending invitation exists for this crew + invitee
 * 8. Max 20 invitations per crew not exceeded
 * 9. Insert invitation with message_is_custom flag
 * 10. Create notification (type = 'crew_invitation')
 *
 * Requirements: 3.1–3.5, 3.8–3.12, 12.6–12.9
 */
export async function sendCrewInvitation(
  input: SendCrewInvitationInput,
): Promise<{ invitation?: EventCrewInvitation; error?: string }> {
  const parsed = sendCrewInvitationSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Get authenticated user
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
  if (crew.status !== 'active') return { error: 'Crew is not active' };

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
    return { error: 'Only the host or moderators can send invitations' };
  }

  // ------------------------------------------------------------------
  // 4. Validate crew is not full (participant_count < capacity)
  // ------------------------------------------------------------------
  if (crew.participant_count >= crew.capacity) {
    return { error: 'Crew is full' };
  }

  // ------------------------------------------------------------------
  // 5. Validate invitee has not blocked the host (check blocked_users)
  // ------------------------------------------------------------------
  const { data: blocked } = await supabase
    .from('blocked_users')
    .select('blocker_id')
    .eq('blocker_id', parsed.data.invitee_id)
    .eq('blocked_id', crew.host_id)
    .single();

  if (blocked) {
    return { error: 'Cannot invite this user' };
  }

  // ------------------------------------------------------------------
  // 6. Validate invitee is not already in a crew for this event
  // ------------------------------------------------------------------
  const { data: existingMembership } = await supabase
    .from('event_crew_members')
    .select('crew_id, event_crews!inner(event_id)')
    .eq('user_id', parsed.data.invitee_id)
    .eq('event_crews.event_id', crew.event_id)
    .limit(1);

  if (existingMembership && existingMembership.length > 0) {
    return { error: 'User is already in a crew for this event' };
  }

  // ------------------------------------------------------------------
  // 7. Validate no duplicate pending invitation for this crew + invitee
  // ------------------------------------------------------------------
  const { data: existingInvitation } = await supabase
    .from('event_crew_invitations')
    .select('id')
    .eq('crew_id', parsed.data.crew_id)
    .eq('invitee_id', parsed.data.invitee_id)
    .eq('status', 'pending')
    .limit(1);

  if (existingInvitation && existingInvitation.length > 0) {
    return { error: 'A pending invitation already exists for this user' };
  }

  // ------------------------------------------------------------------
  // 8. Validate max 20 invitations per crew not exceeded
  // ------------------------------------------------------------------
  const { count: invitationCount } = await supabase
    .from('event_crew_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', parsed.data.crew_id);

  if ((invitationCount ?? 0) >= MAX_INVITATIONS_PER_CREW) {
    return {
      error: `Cannot send more than ${MAX_INVITATIONS_PER_CREW} invitations per crew`,
    };
  }

  // ------------------------------------------------------------------
  // 9. Insert invitation with message_is_custom flag
  // ------------------------------------------------------------------
  const hasCustomMessage = !!parsed.data.message && parsed.data.message.length > 0;

  const { data: invitation, error: insertError } = await supabase
    .from('event_crew_invitations')
    .insert({
      crew_id: parsed.data.crew_id,
      inviter_id: user.id,
      invitee_id: parsed.data.invitee_id,
      message: hasCustomMessage ? parsed.data.message! : null,
      message_is_custom: hasCustomMessage,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !invitation) {
    return { error: insertError?.message ?? 'Failed to send invitation' };
  }

  // ------------------------------------------------------------------
  // 10. Create notification (type = 'crew_invitation')
  // ------------------------------------------------------------------
  // Get inviter's display name for the notification
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const inviterName = inviterProfile?.display_name || 'Someone';

  // Get event title for the notification
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', crew.event_id)
    .single();

  const eventTitle = event?.title || 'an event';

  const notificationBody = hasCustomMessage
    ? parsed.data.message!
    : `${inviterName} invites you to join a crew for ${eventTitle}`;

  await createNotification({
    userId: parsed.data.invitee_id,
    type: 'crew_invitation',
    title: `Crew invitation: ${crew.name}`,
    body: notificationBody,
    data: {
      crew_id: crew.id,
      event_id: crew.event_id,
      invitation_id: invitation.id,
    },
  });

  return { invitation: invitation as EventCrewInvitation };
}

// ---------------------------------------------------------------------------
// getCrewMessages
// ---------------------------------------------------------------------------

const getCrewMessagesSchema = z.object({
  crew_id: z.string().uuid(),
  cursor: z.string().optional(), // ISO timestamp of last message
  cursor_id: z.string().uuid().optional(), // UUID of last message (for tie-breaking)
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type GetCrewMessagesInput = z.infer<typeof getCrewMessagesSchema>;

export interface CrewMessageWithSender {
  id: string;
  crew_id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
  sender: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Retrieves paginated messages for a crew chat, newest first.
 *
 * Uses cursor-based (keyset) pagination on (created_at, id) — no OFFSET.
 * If cursor + cursor_id are provided, returns messages where
 * (created_at, id) < (cursor, cursor_id).
 *
 * Returns messages with sender profile info (display_name, avatar_url)
 * and a nextCursor for fetching the next page.
 *
 * Requirements: 5.2, 5.3
 */
export async function getCrewMessages(
  input: GetCrewMessagesInput,
): Promise<{
  messages?: CrewMessageWithSender[];
  nextCursor?: { created_at: string; id: string } | null;
  error?: string;
}> {
  const parsed = getCrewMessagesSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const { crew_id, cursor, cursor_id, limit } = parsed.data;

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate user is a member of the crew
  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('crew_id')
    .eq('crew_id', crew_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { error: 'You are not a member of this crew' };
  }

  // 3. Build the query for messages with sender profile info
  let query = supabase
    .from('event_crew_messages')
    .select(
      `
      id,
      crew_id,
      sender_id,
      content,
      is_system,
      created_at,
      profiles!event_crew_messages_sender_id_fkey (
        display_name,
        avatar_url
      )
    `,
    )
    .eq('crew_id', crew_id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  // 4. If cursor provided, filter where (created_at, id) < cursor values
  if (cursor && cursor_id) {
    // Keyset pagination: get messages older than the cursor
    // (created_at < cursor) OR (created_at = cursor AND id < cursor_id)
    query = query.or(
      `created_at.lt.${cursor},and(created_at.eq.${cursor},id.lt.${cursor_id})`,
    );
  }

  const { data: messages, error: queryError } = await query;

  if (queryError) {
    return { error: queryError.message };
  }

  // 5. Map results to include sender profile info
  const mappedMessages: CrewMessageWithSender[] = (messages || []).map(
    (msg: any) => ({
      id: msg.id,
      crew_id: msg.crew_id,
      sender_id: msg.sender_id,
      content: msg.content,
      is_system: msg.is_system,
      created_at: msg.created_at,
      sender: msg.profiles
        ? {
            display_name: msg.profiles.display_name ?? null,
            avatar_url: msg.profiles.avatar_url ?? null,
          }
        : null,
    }),
  );

  // 6. Determine nextCursor
  // If we got fewer messages than the limit, there are no more pages
  const nextCursor =
    mappedMessages.length < limit
      ? null
      : {
          created_at: mappedMessages[mappedMessages.length - 1].created_at,
          id: mappedMessages[mappedMessages.length - 1].id,
        };

  return { messages: mappedMessages, nextCursor };
}

// ---------------------------------------------------------------------------
// sendCrewMessage
// ---------------------------------------------------------------------------

const sendCrewMessageSchema = z.object({
  crew_id: z.string().uuid(),
  content: z.string().trim().min(1).max(CREW_MESSAGE_MAX_LENGTH),
});

export type SendCrewMessageInput = z.infer<typeof sendCrewMessageSchema>;

/**
 * Sends a message to a crew chat.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Content is not empty and within CREW_MESSAGE_MAX_LENGTH (2000 chars)
 * 3. Crew exists and is active
 * 4. User is a member of the crew
 *
 * On success: inserts into event_crew_messages with is_system = false.
 *
 * Requirements: 5.3, 5.4, 12.10
 */
export async function sendCrewMessage(
  input: SendCrewMessageInput,
): Promise<{ message?: EventCrewMessage; error?: string }> {
  const parsed = sendCrewMessageSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate crew exists and is active
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('id, status')
    .eq('id', parsed.data.crew_id)
    .single();

  if (crewError || !crew) return { error: 'Crew not found' };
  if (crew.status !== 'active') {
    return { error: 'Cannot send messages to an archived crew' };
  }

  // 3. Validate user is a member of the crew
  const { data: membership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('crew_id, user_id')
    .eq('crew_id', parsed.data.crew_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { error: 'You are not a member of this crew' };
  }

  // 4. Insert message into event_crew_messages
  const { data: message, error: insertError } = await supabase
    .from('event_crew_messages')
    .insert({
      crew_id: parsed.data.crew_id,
      sender_id: user.id,
      content: parsed.data.content,
      is_system: false,
    })
    .select()
    .single();

  if (insertError || !message) {
    return { error: insertError?.message ?? 'Failed to send message' };
  }

  return { message: message as EventCrewMessage };
}

// ---------------------------------------------------------------------------
// getMyCrews
// ---------------------------------------------------------------------------

export interface MyCrewItem {
  id: string;
  name: string;
  status: CrewStatus;
  participant_count: number;
  capacity: number;
  role: CrewRole;
  event: {
    id: string;
    title: string;
    starts_at: string;
  };
}

/**
 * Returns the current user's crews (both active and archived) with event info.
 * Supports an optional status filter to show only active or archived crews.
 * Results are ordered by crew created_at descending (newest first).
 *
 * Requirements: 7.3
 */
export async function getMyCrews(input?: {
  status?: 'active' | 'archived';
}): Promise<{ crews?: MyCrewItem[]; error?: string }> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Query event_crew_members for this user, joining with event_crews and events
  let query = supabase
    .from('event_crew_members')
    .select(
      `
      role,
      event_crews!inner (
        id,
        name,
        status,
        participant_count,
        capacity,
        created_at,
        events!inner (
          id,
          title,
          starts_at
        )
      )
    `,
    )
    .eq('user_id', user.id);

  // 3. Apply status filter if provided
  if (input?.status) {
    query = query.eq('event_crews.status', input.status);
  }

  // 4. Order by crew created_at descending (newest first)
  query = query.order('created_at', { referencedTable: 'event_crews', ascending: false });

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  // 5. Map the joined data into the flat return structure
  const crews: MyCrewItem[] = (data || []).map((row: any) => ({
    id: row.event_crews.id,
    name: row.event_crews.name,
    status: row.event_crews.status as CrewStatus,
    participant_count: row.event_crews.participant_count,
    capacity: row.event_crews.capacity,
    role: row.role as CrewRole,
    event: {
      id: row.event_crews.events.id,
      title: row.event_crews.events.title,
      starts_at: row.event_crews.events.starts_at,
    },
  }));

  return { crews };
}

// ---------------------------------------------------------------------------
// getCrewDetails
// ---------------------------------------------------------------------------

export interface CrewMemberWithProfile {
  user_id: string;
  role: CrewRole;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

export interface CrewDetailsResult {
  crew?: EventCrew & {
    members: CrewMemberWithProfile[];
    pendingInvitations?: Array<{
      id: string;
      inviter_id: string;
      invitee_id: string;
      message: string | null;
      message_is_custom: boolean;
      status: string;
      created_at: string;
      invitee_display_name: string;
      invitee_avatar_url: string | null;
    }>;
    pendingRequests?: Array<{
      id: string;
      requester_id: string;
      message: string | null;
      status: string;
      created_at: string;
      requester_display_name: string;
      requester_avatar_url: string | null;
    }>;
  };
  myRole?: CrewRole;
  error?: string;
}

/**
 * Returns full crew details including members, and optionally pending
 * invitations and join requests (for host/moderator only).
 *
 * Validations:
 * 1. User is authenticated
 * 2. User is a member of the crew
 *
 * Returns:
 * - Full crew data from event_crews
 * - All members with profile info (display_name, avatar_url) and roles
 * - User's own role in the crew
 * - Pending invitations (host/moderator only)
 * - Pending join requests (host/moderator only)
 *
 * Requirements: 5.2
 */
export async function getCrewDetails(input: {
  crew_id: string;
}): Promise<CrewDetailsResult> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Validate user is a member of the crew
  const { data: myMembership, error: memberError } = await supabase
    .from('event_crew_members')
    .select('role')
    .eq('crew_id', input.crew_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !myMembership) {
    return { error: 'You are not a member of this crew' };
  }

  const myRole = myMembership.role as CrewRole;

  // 3. Fetch full crew data
  const { data: crew, error: crewError } = await supabase
    .from('event_crews')
    .select('*')
    .eq('id', input.crew_id)
    .single();

  if (crewError || !crew) {
    return { error: 'Crew not found' };
  }

  // 4. Fetch all members with profile info
  const { data: membersData, error: membersError } = await supabase
    .from('event_crew_members')
    .select(
      `
      user_id,
      role,
      joined_at,
      profiles!event_crew_members_user_id_fkey (
        display_name,
        avatar_url
      )
    `,
    )
    .eq('crew_id', input.crew_id)
    .order('joined_at', { ascending: true });

  if (membersError) {
    return { error: membersError.message };
  }

  const members: CrewMemberWithProfile[] = (membersData || []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role as CrewRole,
    joined_at: m.joined_at,
    display_name: m.profiles?.display_name ?? '',
    avatar_url: m.profiles?.avatar_url ?? null,
  }));

  // 5. If user is host or moderator: fetch pending invitations and requests
  const isHostOrModerator = myRole === 'host' || myRole === 'moderator';

  let pendingInvitations:
    | Array<{
        id: string;
        inviter_id: string;
        invitee_id: string;
        message: string | null;
        message_is_custom: boolean;
        status: string;
        created_at: string;
        invitee_display_name: string;
        invitee_avatar_url: string | null;
      }>
    | undefined = undefined;
  let pendingRequests:
    | Array<{
        id: string;
        requester_id: string;
        message: string | null;
        status: string;
        created_at: string;
        requester_display_name: string;
        requester_avatar_url: string | null;
      }>
    | undefined = undefined;

  if (isHostOrModerator) {
    // Fetch pending invitations with invitee profile info
    const { data: invitationsData } = await supabase
      .from('event_crew_invitations')
      .select(
        `
        id,
        inviter_id,
        invitee_id,
        message,
        message_is_custom,
        status,
        created_at,
        profiles!event_crew_invitations_invitee_id_fkey (
          display_name,
          avatar_url
        )
      `,
      )
      .eq('crew_id', input.crew_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    pendingInvitations = (invitationsData || []).map((inv: any) => ({
      id: inv.id,
      inviter_id: inv.inviter_id,
      invitee_id: inv.invitee_id,
      message: inv.message,
      message_is_custom: inv.message_is_custom,
      status: inv.status,
      created_at: inv.created_at,
      invitee_display_name: inv.profiles?.display_name ?? '',
      invitee_avatar_url: inv.profiles?.avatar_url ?? null,
    }));

    // Fetch pending join requests with requester profile info
    const { data: requestsData } = await supabase
      .from('event_crew_join_requests')
      .select(
        `
        id,
        requester_id,
        message,
        status,
        created_at,
        profiles!event_crew_join_requests_requester_id_fkey (
          display_name,
          avatar_url
        )
      `,
      )
      .eq('crew_id', input.crew_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    pendingRequests = (requestsData || []).map((req: any) => ({
      id: req.id,
      requester_id: req.requester_id,
      message: req.message,
      status: req.status,
      created_at: req.created_at,
      requester_display_name: req.profiles?.display_name ?? '',
      requester_avatar_url: req.profiles?.avatar_url ?? null,
    }));
  }

  // 6. Build and return the result
  const crewWithDetails = {
    ...(crew as EventCrew),
    members,
    ...(isHostOrModerator ? { pendingInvitations, pendingRequests } : {}),
  };

  return {
    crew: crewWithDetails as CrewDetailsResult['crew'],
    myRole,
  };
}

// ---------------------------------------------------------------------------
// getCrewsForEvent
// ---------------------------------------------------------------------------

export interface PublicCrewInfo {
  id: string;
  name: string;
  languages: string[];
  capacity: number;
  participant_count: number;
}

export interface GetCrewsForEventResult {
  publicCrews: PublicCrewInfo[];
  crewCount: number;
  myCrewId?: string | null;
  error?: string;
}

/**
 * Returns crew information for an event page:
 * - Public crews with details (name, languages, capacity, participant_count)
 * - Aggregate count of all active crews (public + private)
 * - Current user's crew ID if they belong to one for this event
 *
 * Works for both authenticated and unauthenticated users.
 * Unauthenticated users will not get myCrewId.
 *
 * Requirements: 4.2, 4.3, 6.1–6.4
 */
export async function getCrewsForEvent(input: {
  event_id: string;
}): Promise<GetCrewsForEventResult> {
  const supabase = await createClient();

  // 1. Get authenticated user (optional — works for unauthenticated too)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Query all active crews for this event to get the aggregate count
  const { count: crewCount, error: countError } = await supabase
    .from('event_crews')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', input.event_id)
    .eq('status', 'active');

  if (countError) {
    return { publicCrews: [], crewCount: 0, error: countError.message };
  }

  // 3. Query public crews with details
  const { data: publicCrews, error: publicError } = await supabase
    .from('event_crews')
    .select('id, name, languages, capacity, participant_count')
    .eq('event_id', input.event_id)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .order('created_at', { ascending: true });

  if (publicError) {
    return { publicCrews: [], crewCount: crewCount ?? 0, error: publicError.message };
  }

  const mappedPublicCrews: PublicCrewInfo[] = (publicCrews || []).map((crew) => ({
    id: crew.id,
    name: crew.name,
    languages: crew.languages ?? [],
    capacity: crew.capacity,
    participant_count: crew.participant_count,
  }));

  // 4. If user is authenticated, check if they're in a crew for this event
  let myCrewId: string | null = null;

  if (user) {
    const { data: membership } = await supabase
      .from('event_crew_members')
      .select('crew_id, event_crews!inner(event_id)')
      .eq('user_id', user.id)
      .eq('event_crews.event_id', input.event_id)
      .limit(1);

    if (membership && membership.length > 0) {
      myCrewId = membership[0].crew_id;
    }
  }

  return {
    publicCrews: mappedPublicCrews,
    crewCount: crewCount ?? 0,
    myCrewId,
  };
}
