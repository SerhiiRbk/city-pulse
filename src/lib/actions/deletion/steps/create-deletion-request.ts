import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';
import { calculateGracePeriodEnd } from '@/lib/deletion/grace-period';

/**
 * Step: Create deletion request
 *
 * - Inserts deletion_requests record with status = 'pending'
 * - Sets grace_period_ends_at = requestedAt + 30 days (720 hours)
 * - Sets profiles.deleted_at = now() for the user's profile
 * - Creates audit log entry (action: 'deletion_requested')
 * - If this fails after auth deletion, logs a CRITICAL error for manual recovery
 *   (the system is in an inconsistent state: auth deleted but no deletion record)
 */
export const createDeletionRequest: SoftDeleteStep = {
  name: 'createDeletionRequest',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    const gracePeriodEndsAt = calculateGracePeriodEnd(ctx.requestedAt);

    // 1. Insert deletion_requests record
    const { error: insertError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: ctx.userId,
        requested_at: ctx.requestedAt.toISOString(),
        grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        status: 'pending',
        transferred_event_ids: ctx.transferredEventIds || [],
      });

    if (insertError) {
      // CRITICAL: Auth record was already deleted in the previous step.
      // This is an inconsistent state that requires manual recovery.
      console.error(
        `[soft-delete] CRITICAL: Failed to insert deletion_request after auth deletion. ` +
          `User ${ctx.userId} has been removed from auth but has no deletion record. ` +
          `Manual recovery required. Error: ${insertError.message}`,
      );
      throw new Error(
        `Failed to create deletion request: ${insertError.message}`,
      );
    }

    // 2. Set profiles.deleted_at = now() for soft-delete visibility filtering
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ctx.userId);

    if (profileError) {
      console.error(
        `[soft-delete] CRITICAL: Failed to set profiles.deleted_at for user ${ctx.userId}. ` +
          `Error: ${profileError.message}`,
      );
      throw new Error(
        `Failed to update profile deleted_at: ${profileError.message}`,
      );
    }

    // 3. Create audit log entry
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        action: 'deletion_requested',
        target_type: 'user',
        target_id: ctx.userId,
        actor_id: ctx.userId,
        metadata: {
          requested_at: ctx.requestedAt.toISOString(),
          grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        },
      });

    if (auditError) {
      // Audit log failure is non-critical — log but don't throw
      console.error(
        `[soft-delete] Failed to create audit log entry for user ${ctx.userId}: ${auditError.message}`,
      );
    }
  },

  // No rollback — this step is after the point of no return (auth already deleted).
  // If it fails, a CRITICAL error is logged for manual reconciliation.
};
