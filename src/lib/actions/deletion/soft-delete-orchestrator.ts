import type { SupabaseClient } from '@supabase/supabase-js';

import { transferEventOrganizers } from './steps/transfer-event-organizers';
import { resolveCrews } from './steps/resolve-crews';
import { resolveGroups } from './steps/resolve-groups';
import { cancelFutureRsvps } from './steps/cancel-future-rsvps';
import { closeConversations } from './steps/close-conversations';
import { removeContacts } from './steps/remove-contacts';
import { cancelCrewInvitations } from './steps/cancel-crew-invitations';
import { removeEventModerators } from './steps/remove-event-moderators';
import { deleteAuthRecord } from './steps/delete-auth-record';
import { createDeletionRequest } from './steps/create-deletion-request';
import { sendConfirmationEmail } from './steps/send-confirmation-email';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SoftDeleteContext {
  userId: string;
  userEmail: string;
  userLocale: string;
  displayName: string;
  requestedAt: Date;
  /** Mutable state for inter-step communication */
  transferredEventIds?: string[];
}

export interface SoftDeleteStep {
  name: string;
  execute: (ctx: SoftDeleteContext, supabase: SupabaseClient) => Promise<void>;
  rollback?: (ctx: SoftDeleteContext, supabase: SupabaseClient) => Promise<void>;
}

export interface SoftDeleteResult {
  success: boolean;
  failedStep?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Step definitions (ordered)
// ---------------------------------------------------------------------------

/**
 * Ordered list of soft-delete steps. Each step executes in sequence.
 * If a step fails, all previously completed steps are rolled back in reverse.
 *
 * The `sendConfirmationEmail` step is non-critical — its failure does NOT
 * trigger rollback of prior steps.
 */
const SOFT_DELETE_STEPS: SoftDeleteStep[] = [
  transferEventOrganizers,
  resolveCrews,
  resolveGroups,
  cancelFutureRsvps,
  closeConversations,
  removeContacts,
  cancelCrewInvitations,
  removeEventModerators,
  deleteAuthRecord,
  createDeletionRequest,
  sendConfirmationEmail,
];

/** Step name that should not cause rollback on failure (non-critical) */
const NON_CRITICAL_STEPS = new Set(['sendConfirmationEmail']);

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Executes the soft-delete process by running each step in order.
 *
 * - On success: returns `{ success: true }`
 * - On critical step failure: rolls back completed steps in reverse order,
 *   returns `{ success: false, failedStep, error }`
 * - On non-critical step failure (e.g. sendConfirmationEmail): logs the error
 *   but still returns `{ success: true }`
 */
export async function executeSoftDelete(
  ctx: SoftDeleteContext,
  supabase: SupabaseClient,
): Promise<SoftDeleteResult> {
  const completedSteps: SoftDeleteStep[] = [];

  for (const step of SOFT_DELETE_STEPS) {
    try {
      await step.execute(ctx, supabase);
      completedSteps.push(step);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';

      // Non-critical steps: log failure but don't roll back
      if (NON_CRITICAL_STEPS.has(step.name)) {
        console.error(
          `[soft-delete] Non-critical step "${step.name}" failed: ${errorMessage}`,
        );
        continue;
      }

      // Critical step failed — roll back completed steps in reverse order
      console.error(
        `[soft-delete] Step "${step.name}" failed: ${errorMessage}. Rolling back...`,
      );

      await rollbackSteps(completedSteps, ctx, supabase);

      return {
        success: false,
        failedStep: step.name,
        error: errorMessage,
      };
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Rollback helper
// ---------------------------------------------------------------------------

/**
 * Rolls back completed steps in reverse order. If a rollback itself fails,
 * the error is logged but rollback continues for remaining steps.
 */
async function rollbackSteps(
  completedSteps: SoftDeleteStep[],
  ctx: SoftDeleteContext,
  supabase: SupabaseClient,
): Promise<void> {
  for (let i = completedSteps.length - 1; i >= 0; i--) {
    const step = completedSteps[i];
    if (!step.rollback) continue;

    try {
      await step.rollback(ctx, supabase);
    } catch (rollbackErr) {
      const msg =
        rollbackErr instanceof Error
          ? rollbackErr.message
          : 'Unknown rollback error';
      console.error(
        `[soft-delete] Rollback of step "${step.name}" failed: ${msg}`,
      );
    }
  }
}
