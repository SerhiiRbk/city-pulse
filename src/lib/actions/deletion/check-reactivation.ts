'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ReactivationCheckResult {
  needsReactivation: boolean;
  expiresAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// checkReactivation
// ---------------------------------------------------------------------------

/**
 * Server-side function to check if the currently authenticated user has a
 * pending deletion request (soft-deleted account within the grace period).
 *
 * This should be called after successful authentication to determine whether
 * the user should be shown the reactivation prompt.
 *
 * Flow:
 * 1. Get the current user from auth
 * 2. Query deletion_requests where user_id = currentUser.id AND status = 'pending'
 * 3. If found and grace_period_ends_at > now(): return { needsReactivation: true, expiresAt }
 * 4. If found but grace_period_ends_at <= now(): return { needsReactivation: false, error: 'Account permanently deleted' }
 * 5. If not found: return { needsReactivation: false }
 *
 * Requirements: 2.4, 2.6
 */
export async function checkReactivation(): Promise<ReactivationCheckResult> {
  try {
    const supabase = await createClient();

    // 1. Get the current user from auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { needsReactivation: false };
    }

    // 2. Query deletion_requests where user_id = currentUser.id AND status = 'pending'
    const admin = createAdminClient();
    const { data: deletionRequest, error: queryError } = await admin
      .from('deletion_requests')
      .select('grace_period_ends_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (queryError) {
      console.error(
        `[checkReactivation] Failed to query deletion request: ${queryError.message}`,
      );
      return { needsReactivation: false };
    }

    // 5. If not found: return { needsReactivation: false }
    if (!deletionRequest) {
      return { needsReactivation: false };
    }

    // 3. If found and grace_period_ends_at > now(): needs reactivation
    const now = new Date();
    const expiresAt = new Date(deletionRequest.grace_period_ends_at);

    if (expiresAt > now) {
      return {
        needsReactivation: true,
        expiresAt: deletionRequest.grace_period_ends_at,
      };
    }

    // 4. If found but grace_period_ends_at <= now(): account permanently deleted
    return {
      needsReactivation: false,
      error: 'Account permanently deleted',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[checkReactivation] Unexpected error: ${message}`);
    return { needsReactivation: false };
  }
}
