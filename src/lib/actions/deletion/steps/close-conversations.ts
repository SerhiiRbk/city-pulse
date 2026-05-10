import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/** Stored rollback state for conversation status changes */
interface ConversationSnapshot {
  id: string;
  status: string;
}

/** Module-level rollback state keyed by userId */
const rollbackState = new Map<string, ConversationSnapshot[]>();

/**
 * Step: Close conversations
 *
 * - Updates conversations where user is participant_1 or participant_2
 *   and status = 'active' to status = 'closed'
 * - Updates conversations with status = 'pending' to status = 'declined'
 */
export const closeConversations: SoftDeleteStep = {
  name: 'closeConversations',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // 1. Query active conversations where user is a participant
    const { data: activeConversations, error: activeError } = await supabase
      .from('conversations')
      .select('id, status')
      .eq('status', 'active')
      .or(`participant_1.eq.${ctx.userId},participant_2.eq.${ctx.userId}`);

    if (activeError) {
      throw new Error(`Failed to query active conversations: ${activeError.message}`);
    }

    // 2. Query pending conversations where user is a participant
    const { data: pendingConversations, error: pendingError } = await supabase
      .from('conversations')
      .select('id, status')
      .eq('status', 'pending')
      .or(`participant_1.eq.${ctx.userId},participant_2.eq.${ctx.userId}`);

    if (pendingError) {
      throw new Error(`Failed to query pending conversations: ${pendingError.message}`);
    }

    // 3. Store original states for rollback
    const snapshots: ConversationSnapshot[] = [
      ...(activeConversations ?? []).map((c) => ({ id: c.id, status: c.status })),
      ...(pendingConversations ?? []).map((c) => ({ id: c.id, status: c.status })),
    ];

    rollbackState.set(ctx.userId, snapshots);

    // 4. Update active conversations to 'closed'
    if (activeConversations && activeConversations.length > 0) {
      const activeIds = activeConversations.map((c) => c.id);
      const { error: updateActiveError } = await supabase
        .from('conversations')
        .update({ status: 'closed' })
        .in('id', activeIds);

      if (updateActiveError) {
        throw new Error(`Failed to close active conversations: ${updateActiveError.message}`);
      }
    }

    // 5. Update pending conversations to 'declined'
    if (pendingConversations && pendingConversations.length > 0) {
      const pendingIds = pendingConversations.map((c) => c.id);
      const { error: updatePendingError } = await supabase
        .from('conversations')
        .update({ status: 'declined' })
        .in('id', pendingIds);

      if (updatePendingError) {
        throw new Error(`Failed to decline pending conversations: ${updatePendingError.message}`);
      }
    }
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    const snapshots = rollbackState.get(ctx.userId);
    if (!snapshots || snapshots.length === 0) return;

    // Restore original statuses for all modified conversations
    for (const snapshot of snapshots) {
      await supabase
        .from('conversations')
        .update({ status: snapshot.status })
        .eq('id', snapshot.id);
    }

    rollbackState.delete(ctx.userId);
  },
};
