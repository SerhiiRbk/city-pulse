import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/**
 * Step: Cancel crew invitations
 *
 * NOTE: Crew invitation and join request cancellation is handled by the
 * `resolveCrews` step (task 4.3) as part of the crew resolution logic.
 * This step exists as a no-op to maintain the orchestrator's step ordering
 * without duplicating work.
 */
export const cancelCrewInvitations: SoftDeleteStep = {
  name: 'cancelCrewInvitations',

  async execute(_ctx: SoftDeleteContext, _supabase: SupabaseClient): Promise<void> {
    // Invitation/request cancellation is handled in resolveCrews step.
    // This step is intentionally a no-op.
  },

  async rollback(_ctx: SoftDeleteContext, _supabase: SupabaseClient): Promise<void> {
    // Rollback is handled in resolveCrews step.
  },
};
