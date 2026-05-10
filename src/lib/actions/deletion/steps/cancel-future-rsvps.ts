import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/** Statuses that should be cancelled for future events */
const ACTIVE_STATUSES = ['going', 'waitlist', 'interested'] as const;

/** Stored rollback data: original statuses for each cancelled RSVP */
interface RsvpSnapshot {
  event_id: string;
  user_id: string;
  status: string;
}

/**
 * Module-scoped rollback state. Safe because the orchestrator runs steps
 * sequentially within a single `executeSoftDelete` call, and each call
 * processes exactly one user.
 */
let _rollbackSnapshots: RsvpSnapshot[] = [];

/**
 * Step: Cancel future RSVPs
 *
 * - Sets status = 'cancelled' for event_attendees where
 *   status IN ('going', 'waitlist', 'interested') AND event.starts_at > now()
 * - Relies on existing DB trigger for waitlist promotion
 * - Rolls back all changes on partial failure
 */
export const cancelFutureRsvps: SoftDeleteStep = {
  name: 'cancelFutureRsvps',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Reset rollback state
    _rollbackSnapshots = [];

    // 1. Query future active RSVPs for this user by joining with events
    const { data: futureRsvps, error: selectError } = await supabase
      .from('event_attendees')
      .select('event_id, user_id, status, events!inner(starts_at)')
      .eq('user_id', ctx.userId)
      .in('status', [...ACTIVE_STATUSES])
      .gt('events.starts_at', new Date().toISOString());

    if (selectError) {
      throw new Error(`Failed to query future RSVPs: ${selectError.message}`);
    }

    // Nothing to cancel
    if (!futureRsvps || futureRsvps.length === 0) {
      return;
    }

    // 2. Store original statuses for rollback
    _rollbackSnapshots = futureRsvps.map((rsvp) => ({
      event_id: rsvp.event_id,
      user_id: rsvp.user_id,
      status: rsvp.status,
    }));

    // 3. Update all matching records to status = 'cancelled'
    const eventIds = futureRsvps.map((r) => r.event_id);

    const { error: updateError } = await supabase
      .from('event_attendees')
      .update({ status: 'cancelled' })
      .eq('user_id', ctx.userId)
      .in('event_id', eventIds)
      .in('status', [...ACTIVE_STATUSES]);

    if (updateError) {
      throw new Error(`Failed to cancel future RSVPs: ${updateError.message}`);
    }

    // The existing DB trigger handles waitlist promotion automatically
    // when a 'going' status is cancelled for events with max_attendees.
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    if (_rollbackSnapshots.length === 0) return;

    // Restore each record to its original status
    const restorePromises = _rollbackSnapshots.map((snapshot) =>
      supabase
        .from('event_attendees')
        .update({ status: snapshot.status })
        .eq('event_id', snapshot.event_id)
        .eq('user_id', snapshot.user_id),
    );

    const results = await Promise.all(restorePromises);

    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      console.error(
        `[cancelFutureRsvps] Rollback partially failed: ${failures.length}/${results.length} records could not be restored`,
      );
    }

    // Clear rollback state
    _rollbackSnapshots = [];
  },
};
