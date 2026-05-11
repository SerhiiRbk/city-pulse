import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/**
 * Step: Delete auth record
 *
 * - Calls supabase auth.admin.deleteUser to remove from Supabase Auth
 * - This terminates all active sessions immediately
 * - This is the point of no return — after this, the user cannot log in
 * - No rollback is possible for this step (auth deletion is irreversible)
 */
export const deleteAuthRecord: SoftDeleteStep = {
  name: 'deleteAuthRecord',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // 1. Delete the user from Supabase Auth (terminates all active sessions)
    const { error: authError } = await supabase.auth.admin.deleteUser(ctx.userId);

    if (authError) {
      throw new Error(`Failed to delete auth record: ${authError.message}`);
    }
  },

  // No rollback — auth deletion is irreversible
};
