import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';
import { classifyEvents, type ClassifiableEvent } from '@/lib/deletion/classification';

const SYSTEM_ACCOUNT_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Step: Transfer event organizers
 *
 * - Transfers organizer_id to system account for future published events
 * - Deletes future draft events
 * - Retains past/cancelled events unchanged
 * - Stores transferred event IDs in context for potential reactivation restore
 * - Sends notification to attendees of transferred events
 * - Removes user from event_moderators table
 */
export const transferEventOrganizers: SoftDeleteStep = {
  name: 'transferEventOrganizers',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    const now = new Date();

    // 1. Query events where organizer_id = ctx.userId
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('id, status, ends_at')
      .eq('organizer_id', ctx.userId);

    if (fetchError) {
      throw new Error(`Failed to fetch user events: ${fetchError.message}`);
    }

    if (events && events.length > 0) {
      // 2. Classify events using classifyEvents()
      const classifiableEvents: ClassifiableEvent[] = events.map((e) => ({
        id: e.id,
        status: e.status,
        ends_at: e.ends_at,
      }));

      const classified = classifyEvents(classifiableEvents, now);

      // 3. Transfer future published events to system account
      if (classified.transfer.length > 0) {
        const transferIds = classified.transfer.map((e) => e.id);

        const { error: transferError } = await supabase
          .from('events')
          .update({ organizer_id: SYSTEM_ACCOUNT_UUID })
          .in('id', transferIds);

        if (transferError) {
          throw new Error(`Failed to transfer event organizers: ${transferError.message}`);
        }

        // 5. Store transferred event IDs in context
        ctx.transferredEventIds = transferIds;

        // 6. Send notifications to attendees of transferred events
        await notifyAttendeesOfTransfer(supabase, transferIds);
      }

      // 4. Delete future draft events
      if (classified.delete.length > 0) {
        const deleteIds = classified.delete.map((e) => e.id);

        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .in('id', deleteIds);

        if (deleteError) {
          throw new Error(`Failed to delete draft events: ${deleteError.message}`);
        }
      }
    }

    // 7. Remove user from event_moderators table
    const { error: moderatorError } = await supabase
      .from('event_moderators')
      .delete()
      .eq('user_id', ctx.userId);

    if (moderatorError) {
      throw new Error(`Failed to remove user from event_moderators: ${moderatorError.message}`);
    }
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Restore organizer_id for transferred events
    if (ctx.transferredEventIds && ctx.transferredEventIds.length > 0) {
      const { error } = await supabase
        .from('events')
        .update({ organizer_id: ctx.userId })
        .in('id', ctx.transferredEventIds);

      if (error) {
        console.error(
          `[soft-delete] Rollback of transferEventOrganizers failed: ${error.message}`,
        );
      }
    }

    // Draft events cannot be restored — they're gone
  },
};

/**
 * Sends notifications to all attendees of transferred events informing them
 * of the organizer change.
 */
async function notifyAttendeesOfTransfer(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<void> {
  // Fetch attendees for all transferred events
  const { data: attendees, error: attendeesError } = await supabase
    .from('event_attendees')
    .select('user_id, event_id')
    .in('event_id', eventIds)
    .in('status', ['going', 'waitlist', 'interested']);

  if (attendeesError) {
    throw new Error(`Failed to fetch attendees for notification: ${attendeesError.message}`);
  }

  if (!attendees || attendees.length === 0) {
    return;
  }

  // Create notification records for each attendee
  const notifications = attendees.map((attendee) => ({
    user_id: attendee.user_id,
    type: 'event_organizer_changed',
    data: {
      event_id: attendee.event_id,
      reason: 'organizer_account_deleted',
    },
    read: false,
  }));

  const { error: notifyError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifyError) {
    throw new Error(`Failed to send attendee notifications: ${notifyError.message}`);
  }
}
