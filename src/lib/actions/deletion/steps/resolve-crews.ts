import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';
import { classifyCrewSuccession, type CrewMemberInfo } from '@/lib/deletion/classification';

// ---------------------------------------------------------------------------
// Types for rollback state
// ---------------------------------------------------------------------------

interface OriginalMembership {
  crew_id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'member';
  joined_at: string;
}

interface PromotionRecord {
  crew_id: string;
  promoted_user_id: string;
  original_role: 'moderator' | 'member';
}

/** Module-level closure to store rollback state between execute and rollback */
let rollbackState: {
  originalMemberships: OriginalMembership[];
  promotions: PromotionRecord[];
  deletedCrewIds: string[];
} | null = null;

// ---------------------------------------------------------------------------
// Step: Resolve crews
// ---------------------------------------------------------------------------

/**
 * Step: Resolve crews
 *
 * - Removes user from all event_crew_members
 * - If user is Crew_Host and moderators exist: promote earliest moderator to host
 * - If user is Crew_Host and no moderators: delete crew, notify remaining members
 * - Posts system message "{UserName} left the crew" in crew chat
 * - Cancels pending crew_invitations (invitee_id and inviter_id)
 * - Cancels pending crew_join_requests (requester_id)
 */
export const resolveCrews: SoftDeleteStep = {
  name: 'resolveCrews',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Reset rollback state
    rollbackState = {
      originalMemberships: [],
      promotions: [],
      deletedCrewIds: [],
    };

    // 1. Query all crew memberships for the user
    const { data: memberships, error: fetchError } = await supabase
      .from('event_crew_members')
      .select('crew_id, user_id, role, joined_at')
      .eq('user_id', ctx.userId);

    if (fetchError) {
      throw new Error(`Failed to fetch crew memberships: ${fetchError.message}`);
    }

    if (!memberships || memberships.length === 0) {
      // No crew memberships — still cancel invitations/requests
      await cancelInvitationsAndRequests(ctx, supabase);
      return;
    }

    // Store original memberships for rollback
    rollbackState.originalMemberships = memberships.map((m) => ({
      crew_id: m.crew_id,
      user_id: m.user_id,
      role: m.role as 'host' | 'moderator' | 'member',
      joined_at: m.joined_at,
    }));

    // 2. Process each crew where user is host
    const hostCrews = memberships.filter((m) => m.role === 'host');

    for (const hostMembership of hostCrews) {
      const crewId = hostMembership.crew_id;

      // Get remaining members (excluding the user being deleted)
      const { data: remainingMembers, error: membersError } = await supabase
        .from('event_crew_members')
        .select('user_id, role, joined_at')
        .eq('crew_id', crewId)
        .neq('user_id', ctx.userId);

      if (membersError) {
        throw new Error(`Failed to fetch crew members for crew ${crewId}: ${membersError.message}`);
      }

      const crewMembers: CrewMemberInfo[] = (remainingMembers || []).map((m) => ({
        user_id: m.user_id,
        role: m.role as 'host' | 'moderator' | 'member',
        joined_at: m.joined_at,
      }));

      const succession = classifyCrewSuccession({ id: crewId, members: crewMembers });

      if (succession.type === 'promote_moderator') {
        // Promote the earliest moderator to host
        const { error: promoteError } = await supabase
          .from('event_crew_members')
          .update({ role: 'host' })
          .eq('crew_id', crewId)
          .eq('user_id', succession.moderator.user_id);

        if (promoteError) {
          throw new Error(`Failed to promote moderator in crew ${crewId}: ${promoteError.message}`);
        }

        // Update crew host_id
        const { error: updateHostError } = await supabase
          .from('event_crews')
          .update({ host_id: succession.moderator.user_id, updated_at: new Date().toISOString() })
          .eq('id', crewId);

        if (updateHostError) {
          throw new Error(`Failed to update crew host_id for crew ${crewId}: ${updateHostError.message}`);
        }

        // Track promotion for rollback
        rollbackState.promotions.push({
          crew_id: crewId,
          promoted_user_id: succession.moderator.user_id,
          original_role: 'moderator',
        });
      } else if (succession.type === 'delete_crew') {
        // Get crew info for notification
        const { data: crewInfo } = await supabase
          .from('event_crews')
          .select('name, event_id')
          .eq('id', crewId)
          .single();

        // Notify remaining members before deletion
        if (remainingMembers && remainingMembers.length > 0 && crewInfo) {
          const notifications = remainingMembers.map((m) => ({
            user_id: m.user_id,
            type: 'crew_deleted',
            data: {
              crew_id: crewId,
              event_id: crewInfo.event_id,
              crew_name: crewInfo.name,
              reason: 'host_account_deleted',
            },
            read: false,
          }));

          const { error: notifyError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifyError) {
            throw new Error(`Failed to notify crew members of deletion: ${notifyError.message}`);
          }
        }

        // Delete the crew (CASCADE handles event_crew_members, messages, etc.)
        const { error: deleteError } = await supabase
          .from('event_crews')
          .delete()
          .eq('id', crewId);

        if (deleteError) {
          throw new Error(`Failed to delete crew ${crewId}: ${deleteError.message}`);
        }

        rollbackState.deletedCrewIds.push(crewId);
      }
    }

    // 3. Post system message in each crew chat (for non-deleted crews)
    const nonDeletedCrewIds = memberships
      .map((m) => m.crew_id)
      .filter((id) => !rollbackState!.deletedCrewIds.includes(id));

    if (nonDeletedCrewIds.length > 0) {
      const systemMessages = nonDeletedCrewIds.map((crewId) => ({
        crew_id: crewId,
        sender_id: ctx.userId,
        content: `${ctx.displayName} left the crew`,
        is_system: true,
      }));

      const { error: msgError } = await supabase
        .from('event_crew_messages')
        .insert(systemMessages);

      if (msgError) {
        throw new Error(`Failed to post system messages: ${msgError.message}`);
      }
    }

    // 4. Remove user from all event_crew_members (for non-deleted crews)
    if (nonDeletedCrewIds.length > 0) {
      const { error: removeError } = await supabase
        .from('event_crew_members')
        .delete()
        .eq('user_id', ctx.userId)
        .in('crew_id', nonDeletedCrewIds);

      if (removeError) {
        throw new Error(`Failed to remove user from crews: ${removeError.message}`);
      }

      // Decrement participant_count for non-deleted crews
      for (const crewId of nonDeletedCrewIds) {
        const { data: currentCrew } = await supabase
          .from('event_crews')
          .select('participant_count')
          .eq('id', crewId)
          .single();

        if (currentCrew) {
          await supabase
            .from('event_crews')
            .update({
              participant_count: Math.max(0, currentCrew.participant_count - 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', crewId);
        }
      }
    }

    // 5. Cancel pending crew_invitations and crew_join_requests
    await cancelInvitationsAndRequests(ctx, supabase);
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    if (!rollbackState) return;

    // Reverse host promotions
    for (const promotion of rollbackState.promotions) {
      const { error } = await supabase
        .from('event_crew_members')
        .update({ role: promotion.original_role })
        .eq('crew_id', promotion.crew_id)
        .eq('user_id', promotion.promoted_user_id);

      if (error) {
        console.error(
          `[soft-delete] Rollback: failed to reverse promotion in crew ${promotion.crew_id}: ${error.message}`,
        );
      }

      // Restore original host_id on event_crews
      await supabase
        .from('event_crews')
        .update({ host_id: ctx.userId, updated_at: new Date().toISOString() })
        .eq('id', promotion.crew_id);
    }

    // Re-insert the user into event_crew_members with original roles (for non-deleted crews)
    const membershipsToRestore = rollbackState.originalMemberships.filter(
      (m) => !rollbackState!.deletedCrewIds.includes(m.crew_id),
    );

    for (const membership of membershipsToRestore) {
      const { error } = await supabase
        .from('event_crew_members')
        .insert({
          crew_id: membership.crew_id,
          user_id: membership.user_id,
          role: membership.role,
          joined_at: membership.joined_at,
        });

      if (error) {
        console.error(
          `[soft-delete] Rollback: failed to re-insert membership for crew ${membership.crew_id}: ${error.message}`,
        );
      }
    }

    // Re-activate cancelled invitations and requests
    await supabase
      .from('event_crew_invitations')
      .update({ status: 'pending' })
      .eq('invitee_id', ctx.userId)
      .eq('status', 'cancelled');

    await supabase
      .from('event_crew_invitations')
      .update({ status: 'pending' })
      .eq('inviter_id', ctx.userId)
      .eq('status', 'cancelled');

    await supabase
      .from('event_crew_join_requests')
      .update({ status: 'pending' })
      .eq('requester_id', ctx.userId)
      .eq('status', 'cancelled');

    // Clear rollback state
    rollbackState = null;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cancels all pending crew_invitations (where invitee_id or inviter_id = userId)
 * and pending crew_join_requests (where requester_id = userId).
 */
async function cancelInvitationsAndRequests(
  ctx: SoftDeleteContext,
  supabase: SupabaseClient,
): Promise<void> {
  // Cancel invitations where user is the invitee
  const { error: inviteeError } = await supabase
    .from('event_crew_invitations')
    .update({ status: 'cancelled' })
    .eq('invitee_id', ctx.userId)
    .eq('status', 'pending');

  if (inviteeError) {
    throw new Error(`Failed to cancel crew invitations (invitee): ${inviteeError.message}`);
  }

  // Cancel invitations where user is the inviter
  const { error: inviterError } = await supabase
    .from('event_crew_invitations')
    .update({ status: 'cancelled' })
    .eq('inviter_id', ctx.userId)
    .eq('status', 'pending');

  if (inviterError) {
    throw new Error(`Failed to cancel crew invitations (inviter): ${inviterError.message}`);
  }

  // Cancel join requests where user is the requester
  const { error: requestError } = await supabase
    .from('event_crew_join_requests')
    .update({ status: 'cancelled' })
    .eq('requester_id', ctx.userId)
    .eq('status', 'pending');

  if (requestError) {
    throw new Error(`Failed to cancel crew join requests: ${requestError.message}`);
  }
}
