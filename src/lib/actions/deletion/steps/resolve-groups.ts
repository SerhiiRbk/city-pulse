import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';
import {
  classifyGroupSuccession,
  type GroupMemberInfo,
  type ClassifiableGroup,
} from '@/lib/deletion/classification';

// ---------------------------------------------------------------------------
// Rollback state (module-scoped for simplicity within a single orchestrator run)
// ---------------------------------------------------------------------------

interface RollbackEntry {
  groupId: string;
  originalRole: string;
  promotedUserId?: string;
  previousRole?: string;
  createdByTransferred?: boolean;
  originalCreatedBy?: string;
  wasBlocked?: boolean;
}

let rollbackState: {
  memberships: Array<{ group_id: string; role: string; joined_at: string }>;
  promotions: RollbackEntry[];
  subscriptions: Array<{ group_id: string }>;
} | null = null;

/**
 * Step: Resolve groups
 *
 * - Removes user from group_members
 * - If sole admin and moderators exist: promote earliest moderator to admin
 * - If sole admin and no moderators but members exist: promote earliest member to admin
 * - Transfers created_by if user is group creator
 * - If no members remain: set is_blocked = true
 * - Deletes group_subscriptions for user
 */
export const resolveGroups: SoftDeleteStep = {
  name: 'resolveGroups',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Reset rollback state
    rollbackState = { memberships: [], promotions: [], subscriptions: [] };

    // 1. Query all group memberships for this user
    const { data: userMemberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id, role, joined_at')
      .eq('user_id', ctx.userId);

    if (memberError) {
      throw new Error(`Failed to query group_members: ${memberError.message}`);
    }

    if (!userMemberships || userMemberships.length === 0) {
      // User is not in any groups — just clean up subscriptions
      await deleteGroupSubscriptions(ctx.userId, supabase);
      return;
    }

    // Store memberships for rollback
    rollbackState.memberships = userMemberships.map((m) => ({
      group_id: m.group_id,
      role: m.role,
      joined_at: m.joined_at,
    }));

    // 2. For each group where user is admin, check if they are the sole admin
    const adminGroups = userMemberships.filter((m) => m.role === 'admin');

    for (const adminMembership of adminGroups) {
      const groupId = adminMembership.group_id;

      // Check if user is the sole admin
      const { data: allAdmins, error: adminsError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin');

      if (adminsError) {
        throw new Error(`Failed to query admins for group ${groupId}: ${adminsError.message}`);
      }

      const otherAdmins = (allAdmins || []).filter((a) => a.user_id !== ctx.userId);
      const isSoleAdmin = otherAdmins.length === 0;

      if (!isSoleAdmin) {
        // Not sole admin — no succession needed, just handle created_by if applicable
        await handleCreatedByTransfer(ctx.userId, groupId, otherAdmins[0].user_id, supabase);
        continue;
      }

      // User is sole admin — get remaining members (excluding the user)
      const { data: remainingMembers, error: remainingError } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId)
        .neq('user_id', ctx.userId);

      if (remainingError) {
        throw new Error(`Failed to query remaining members for group ${groupId}: ${remainingError.message}`);
      }

      const group: ClassifiableGroup = {
        id: groupId,
        members: (remainingMembers || []) as GroupMemberInfo[],
      };

      const action = classifyGroupSuccession(group);
      const rollbackEntry: RollbackEntry = { groupId, originalRole: adminMembership.role };

      if (action.type === 'promote_moderator') {
        // Promote earliest moderator to admin
        const { error: promoteError } = await supabase
          .from('group_members')
          .update({ role: 'admin' })
          .eq('group_id', groupId)
          .eq('user_id', action.moderator.user_id);

        if (promoteError) {
          throw new Error(`Failed to promote moderator in group ${groupId}: ${promoteError.message}`);
        }

        rollbackEntry.promotedUserId = action.moderator.user_id;
        rollbackEntry.previousRole = 'moderator';

        // Transfer created_by if user is the creator
        await handleCreatedByTransfer(ctx.userId, groupId, action.moderator.user_id, supabase, rollbackEntry);
      } else if (action.type === 'promote_member') {
        // Promote earliest member to admin
        const { error: promoteError } = await supabase
          .from('group_members')
          .update({ role: 'admin' })
          .eq('group_id', groupId)
          .eq('user_id', action.member.user_id);

        if (promoteError) {
          throw new Error(`Failed to promote member in group ${groupId}: ${promoteError.message}`);
        }

        rollbackEntry.promotedUserId = action.member.user_id;
        rollbackEntry.previousRole = 'member';

        // Transfer created_by if user is the creator
        await handleCreatedByTransfer(ctx.userId, groupId, action.member.user_id, supabase, rollbackEntry);
      } else if (action.type === 'block_group') {
        // No members remain — block the group
        const { error: blockError } = await supabase
          .from('groups')
          .update({ is_blocked: true })
          .eq('id', groupId);

        if (blockError) {
          throw new Error(`Failed to block group ${groupId}: ${blockError.message}`);
        }

        rollbackEntry.wasBlocked = true;
      }

      rollbackState.promotions.push(rollbackEntry);
    }

    // Handle created_by transfer for non-admin groups where user is the creator
    // (user might be creator but not admin — edge case from legacy data)
    const nonAdminGroups = userMemberships.filter((m) => m.role !== 'admin');
    for (const membership of nonAdminGroups) {
      const groupId = membership.group_id;

      // Check if user is the created_by for this group
      const { data: group } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (group && group.created_by === ctx.userId) {
        // Find the first admin of this group to transfer to
        const { data: admins } = await supabase
          .from('group_members')
          .select('user_id, joined_at')
          .eq('group_id', groupId)
          .eq('role', 'admin')
          .neq('user_id', ctx.userId)
          .order('joined_at', { ascending: true })
          .limit(1);

        if (admins && admins.length > 0) {
          const { error: transferError } = await supabase
            .from('groups')
            .update({ created_by: admins[0].user_id })
            .eq('id', groupId);

          if (transferError) {
            throw new Error(`Failed to transfer created_by for group ${groupId}: ${transferError.message}`);
          }

          rollbackState.promotions.push({
            groupId,
            originalRole: membership.role,
            createdByTransferred: true,
            originalCreatedBy: ctx.userId,
          });
        }
      }
    }

    // 4. Remove user from all group_members
    const { error: removeError } = await supabase
      .from('group_members')
      .delete()
      .eq('user_id', ctx.userId);

    if (removeError) {
      throw new Error(`Failed to remove user from group_members: ${removeError.message}`);
    }

    // 5. Delete group_subscriptions for user
    await deleteGroupSubscriptions(ctx.userId, supabase);
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    if (!rollbackState) return;

    // Re-insert user into group_members with original roles
    if (rollbackState.memberships.length > 0) {
      const insertRows = rollbackState.memberships.map((m) => ({
        group_id: m.group_id,
        user_id: ctx.userId,
        role: m.role,
        joined_at: m.joined_at,
      }));

      await supabase.from('group_members').insert(insertRows);
    }

    // Reverse admin promotions and created_by transfers
    for (const entry of rollbackState.promotions) {
      if (entry.promotedUserId && entry.previousRole) {
        // Revert the promoted user back to their original role
        await supabase
          .from('group_members')
          .update({ role: entry.previousRole })
          .eq('group_id', entry.groupId)
          .eq('user_id', entry.promotedUserId);
      }

      if (entry.createdByTransferred && entry.originalCreatedBy) {
        // Restore created_by
        await supabase
          .from('groups')
          .update({ created_by: entry.originalCreatedBy })
          .eq('id', entry.groupId);
      }

      if (entry.wasBlocked) {
        // Unblock the group
        await supabase
          .from('groups')
          .update({ is_blocked: false })
          .eq('id', entry.groupId);
      }
    }

    // Re-insert subscriptions
    if (rollbackState.subscriptions.length > 0) {
      const subRows = rollbackState.subscriptions.map((s) => ({
        group_id: s.group_id,
        user_id: ctx.userId,
      }));

      await supabase.from('group_subscriptions').insert(subRows);
    }

    rollbackState = null;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Transfers created_by of a group if the user being deleted is the creator.
 */
async function handleCreatedByTransfer(
  userId: string,
  groupId: string,
  newOwnerId: string,
  supabase: SupabaseClient,
  rollbackEntry?: RollbackEntry,
): Promise<void> {
  const { data: group } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single();

  if (group && group.created_by === userId) {
    const { error: transferError } = await supabase
      .from('groups')
      .update({ created_by: newOwnerId })
      .eq('id', groupId);

    if (transferError) {
      throw new Error(`Failed to transfer created_by for group ${groupId}: ${transferError.message}`);
    }

    if (rollbackEntry) {
      rollbackEntry.createdByTransferred = true;
      rollbackEntry.originalCreatedBy = userId;
    }
  }
}

/**
 * Deletes all group_subscriptions for the user and stores them for rollback.
 */
async function deleteGroupSubscriptions(
  userId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // Query existing subscriptions for rollback
  const { data: subs } = await supabase
    .from('group_subscriptions')
    .select('group_id')
    .eq('user_id', userId);

  if (subs && subs.length > 0 && rollbackState) {
    rollbackState.subscriptions = subs.map((s) => ({ group_id: s.group_id }));
  }

  // Delete subscriptions
  const { error: subError } = await supabase
    .from('group_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (subError) {
    throw new Error(`Failed to delete group_subscriptions: ${subError.message}`);
  }
}
