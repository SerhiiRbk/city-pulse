'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateConfirmationWord } from '@/lib/deletion/confirmation';
import { determineEmailLocale } from '@/lib/deletion/locale';
import { isRateLimited } from '@/lib/deletion/rate-limit';
import {
  executeSoftDelete,
  type SoftDeleteContext,
} from '@/lib/actions/deletion/soft-delete-orchestrator';

const SYSTEM_ACCOUNT_UUID = '00000000-0000-0000-0000-000000000000';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DeleteAccountInput {
  confirmationWord: string;
}

export interface DeleteAccountResult {
  success?: boolean;
  error?: string;
  errorCode?:
    | 'INVALID_CONFIRMATION'
    | 'RATE_LIMITED'
    | 'ALREADY_PENDING'
    | 'AUTH_ERROR'
    | 'INTERNAL_ERROR';
}

export interface ReactivateResult {
  success?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

/**
 * Server action to initiate account deletion (soft delete).
 *
 * Flow:
 * 1. Validate user is authenticated
 * 2. Check no active deletion request exists (ALREADY_PENDING)
 * 3. Check rate limit: no deletion request in last 24 hours (RATE_LIMITED)
 * 4. Validate confirmation word against user's current locale (INVALID_CONFIRMATION)
 * 5. Check for pending reports, set had_pending_reports flag
 * 6. Call executeSoftDelete orchestrator
 * 7. Return success or appropriate error
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 1.9, 12.4, 12.5, 12.6
 */
export async function deleteAccount(
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated', errorCode: 'AUTH_ERROR' };
    }

    const userId = user.id;
    const admin = createAdminClient();

    // 2. Check no active deletion request exists (ALREADY_PENDING)
    const { data: activeDeletion, error: activeError } = await admin
      .from('deletion_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (activeError) {
      console.error(
        `[deleteAccount] Failed to check active deletion request: ${activeError.message}`,
      );
      return { error: 'Internal error', errorCode: 'INTERNAL_ERROR' };
    }

    if (activeDeletion) {
      return {
        error: 'A deletion request is already pending',
        errorCode: 'ALREADY_PENDING',
      };
    }

    // 3. Check rate limit: no deletion request in last 24 hours (RATE_LIMITED)
    const { data: recentDeletion, error: recentError } = await admin
      .from('deletion_requests')
      .select('requested_at')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentError) {
      console.error(
        `[deleteAccount] Failed to check rate limit: ${recentError.message}`,
      );
      return { error: 'Internal error', errorCode: 'INTERNAL_ERROR' };
    }

    const now = new Date();

    if (recentDeletion) {
      const lastRequestAt = new Date(recentDeletion.requested_at);
      if (isRateLimited(lastRequestAt, now)) {
        return {
          error: 'Rate limit exceeded. Please wait 24 hours before requesting deletion again.',
          errorCode: 'RATE_LIMITED',
        };
      }
    }

    // 4. Get user's locale from their profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('display_name, email, languages')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error(
        `[deleteAccount] Failed to fetch profile: ${profileError?.message}`,
      );
      return { error: 'Internal error', errorCode: 'INTERNAL_ERROR' };
    }

    const userLocale = determineEmailLocale(profile.languages);

    // 5. Validate confirmation word against user's current locale (INVALID_CONFIRMATION)
    if (!validateConfirmationWord(userLocale, input.confirmationWord)) {
      return {
        error: 'Confirmation word does not match',
        errorCode: 'INVALID_CONFIRMATION',
      };
    }

    // 6. Check for pending reports (target_id = userId and status = 'pending')
    const { data: pendingReports, error: reportsError } = await admin
      .from('reports')
      .select('id')
      .eq('target_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (reportsError) {
      console.error(
        `[deleteAccount] Failed to check pending reports: ${reportsError.message}`,
      );
      // Non-critical — proceed with deletion, default to false
    }

    const hadPendingReports = (pendingReports && pendingReports.length > 0) || false;

    // 7. Build SoftDeleteContext and call executeSoftDelete
    const ctx: SoftDeleteContext = {
      userId,
      userEmail: profile.email || user.email || '',
      userLocale,
      displayName: profile.display_name || '',
      requestedAt: now,
    };

    const result = await executeSoftDelete(ctx, admin);

    if (!result.success) {
      console.error(
        `[deleteAccount] Soft delete failed at step "${result.failedStep}": ${result.error}`,
      );
      return {
        error: 'Account deletion failed. Please try again later.',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    // 8. Update deletion_requests with had_pending_reports flag
    if (hadPendingReports) {
      const { error: updateError } = await admin
        .from('deletion_requests')
        .update({ had_pending_reports: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (updateError) {
        // Non-critical — log but don't fail the deletion
        console.error(
          `[deleteAccount] Failed to set had_pending_reports flag: ${updateError.message}`,
        );
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[deleteAccount] Unexpected error: ${message}`);
    return { error: 'Internal error', errorCode: 'INTERNAL_ERROR' };
  }
}


// ---------------------------------------------------------------------------
// getDeletionStatus
// ---------------------------------------------------------------------------

/**
 * Checks whether the current user has an active (pending) deletion request.
 *
 * Returns the pending status and the grace period expiry date.
 * If the user is not authenticated or has no pending request, returns
 * { isPending: false, expiresAt: null }.
 *
 * Requirements: 1.9
 */
export async function getDeletionStatus(): Promise<{
  isPending: boolean;
  expiresAt: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isPending: false, expiresAt: null };
  }

  const { data: request } = await supabase
    .from('deletion_requests')
    .select('grace_period_ends_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (request) {
    return { isPending: true, expiresAt: request.grace_period_ends_at };
  }

  return { isPending: false, expiresAt: null };
}


// ---------------------------------------------------------------------------
// reactivateAccount
// ---------------------------------------------------------------------------

/**
 * Server action to reactivate a soft-deleted account during the grace period.
 *
 * Flow:
 * 1. Get current user from auth
 * 2. Find the pending deletion_request for this user
 * 3. If no pending request, return error
 * 4. Update deletion_request status to 'cancelled', set cancelled_at = now()
 * 5. Set profiles.deleted_at = NULL (restore visibility)
 * 6. Restore transferred event organizer_ids (for events not yet ended)
 * 7. Send notifications to attendees of restored events
 * 8. Create audit log entry (action: 'deletion_cancelled')
 * 9. Return success
 *
 * Note: Contacts are NOT restored on reactivation (Requirement 7.4).
 *
 * Requirements: 2.4, 2.5, 5.6, 5.7, 12.3
 */
export async function reactivateAccount(): Promise<ReactivateResult> {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const userId = user.id;
    const admin = createAdminClient();

    // 2. Find the pending deletion_request for this user
    const { data: deletionRequest, error: fetchError } = await admin
      .from('deletion_requests')
      .select('id, transferred_event_ids, grace_period_ends_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error(
        `[reactivateAccount] Failed to fetch deletion request: ${fetchError.message}`,
      );
      return { error: 'Internal error' };
    }

    // 3. If no pending request, return error
    if (!deletionRequest) {
      return { error: 'No pending deletion request found' };
    }

    // Check if grace period has expired
    const now = new Date();
    if (new Date(deletionRequest.grace_period_ends_at) <= now) {
      return { error: 'Grace period has expired. Account cannot be reactivated.' };
    }

    // 4. Update deletion_request status to 'cancelled', set cancelled_at = now()
    const { error: cancelError } = await admin
      .from('deletion_requests')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
      })
      .eq('id', deletionRequest.id);

    if (cancelError) {
      console.error(
        `[reactivateAccount] Failed to cancel deletion request: ${cancelError.message}`,
      );
      return { error: 'Failed to cancel deletion request' };
    }

    // 5. Set profiles.deleted_at = NULL (restore visibility)
    const { error: profileError } = await admin
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', userId);

    if (profileError) {
      console.error(
        `[reactivateAccount] Failed to restore profile visibility: ${profileError.message}`,
      );
      return { error: 'Failed to restore profile' };
    }

    // 6. Restore transferred event organizer_ids (for events not yet ended)
    const transferredEventIds: string[] = deletionRequest.transferred_event_ids || [];

    if (transferredEventIds.length > 0) {
      // Only restore events that haven't ended yet and are still assigned to system account
      const { data: restorableEvents, error: eventsError } = await admin
        .from('events')
        .select('id')
        .in('id', transferredEventIds)
        .eq('organizer_id', SYSTEM_ACCOUNT_UUID)
        .gt('ends_at', now.toISOString());

      if (eventsError) {
        console.error(
          `[reactivateAccount] Failed to query restorable events: ${eventsError.message}`,
        );
        // Non-critical — continue with reactivation
      }

      if (restorableEvents && restorableEvents.length > 0) {
        const restorableIds = restorableEvents.map((e) => e.id);

        const { error: restoreError } = await admin
          .from('events')
          .update({ organizer_id: userId })
          .in('id', restorableIds);

        if (restoreError) {
          console.error(
            `[reactivateAccount] Failed to restore event organizers: ${restoreError.message}`,
          );
          // Non-critical — continue with reactivation
        }

        // 7. Send notifications to attendees of restored events
        if (!restoreError) {
          await notifyAttendeesOfReactivation(admin, restorableIds);
        }
      }
    }

    // 8. Create audit log entry (action: 'deletion_cancelled')
    const { error: auditError } = await admin
      .from('admin_audit_log')
      .insert({
        action: 'deletion_cancelled',
        target_type: 'user',
        target_id: userId,
        actor_id: userId,
        metadata: {
          cancelled_at: now.toISOString(),
          deletion_request_id: deletionRequest.id,
        },
      });

    if (auditError) {
      // Audit log failure is non-critical — log but don't fail
      console.error(
        `[reactivateAccount] Failed to create audit log entry: ${auditError.message}`,
      );
    }

    // 9. Return success
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[reactivateAccount] Unexpected error: ${message}`);
    return { error: 'Internal error' };
  }
}


// ---------------------------------------------------------------------------
// declineReactivation
// ---------------------------------------------------------------------------

/**
 * Server action to decline reactivation — user wants to stay deleted.
 *
 * Flow:
 * 1. Get current user from auth
 * 2. Sign out the user (destroy session)
 * 3. Delete the re-created auth record using admin.deleteUser
 * 4. Return success
 *
 * The soft-delete state and original grace period remain unchanged.
 *
 * Requirements: 2.6
 */
export async function declineReactivation(): Promise<ReactivateResult> {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const userId = user.id;

    // 2. Sign out the user (destroy session)
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error(
        `[declineReactivation] Failed to sign out user: ${signOutError.message}`,
      );
      // Continue — we still want to delete the auth record
    }

    // 3. Delete the re-created auth record using admin.deleteUser
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(
        `[declineReactivation] Failed to delete auth record: ${deleteError.message}`,
      );
      return { error: 'Failed to remove session' };
    }

    // 4. Return success
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[declineReactivation] Unexpected error: ${message}`);
    return { error: 'Internal error' };
  }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sends notifications to all attendees of restored events informing them
 * that the original organizer has returned.
 */
async function notifyAttendeesOfReactivation(
  supabase: ReturnType<typeof createAdminClient>,
  eventIds: string[],
): Promise<void> {
  const { data: attendees, error: attendeesError } = await supabase
    .from('event_attendees')
    .select('user_id, event_id')
    .in('event_id', eventIds)
    .in('status', ['going', 'waitlist', 'interested']);

  if (attendeesError) {
    console.error(
      `[reactivateAccount] Failed to fetch attendees for notification: ${attendeesError.message}`,
    );
    return;
  }

  if (!attendees || attendees.length === 0) {
    return;
  }

  const notifications = attendees.map((attendee) => ({
    user_id: attendee.user_id,
    type: 'event_organizer_restored',
    data: {
      event_id: attendee.event_id,
      reason: 'organizer_account_reactivated',
    },
    read: false,
  }));

  const { error: notifyError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifyError) {
    console.error(
      `[reactivateAccount] Failed to send attendee notifications: ${notifyError.message}`,
    );
  }
}
