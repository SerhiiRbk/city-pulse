import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/**
 * Step: Remove event moderators
 *
 * Note: The actual removal of event_moderators records is handled in the
 * `transferEventOrganizers` step (step 1) as part of the event organizer
 * handling. This step exists as a no-op to maintain the orchestrator's
 * step ordering contract.
 */
export const removeEventModerators: SoftDeleteStep = {
  name: 'removeEventModerators',

  async execute(_ctx: SoftDeleteContext, _supabase: SupabaseClient): Promise<void> {
    // Event moderator removal is handled in transferEventOrganizers step
  },

  async rollback(_ctx: SoftDeleteContext, _supabase: SupabaseClient): Promise<void> {
    // No rollback needed — handled by transferEventOrganizers rollback
  },
};
