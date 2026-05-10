import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hard Delete Accounts — Vercel Cron route.
 * Schedule: every hour at minute 5 (see `vercel.json`).
 *
 * Processes all deletion_requests where grace_period_ends_at <= now()
 * AND status = 'pending'. For each expired request:
 *
 * 1. Anonymize profile (display_name = 'Deleted User', personal fields = NULL)
 * 2. Anonymize content (replace user_id/sender_id with sentinel UUID)
 * 3. Delete storage files (avatar + user photos) — log failures, continue
 * 4. Delete personal records (notifications, user_badges, event_favorites, user_subscriptions)
 * 5. Handle event_attendees (NULL user_id for past, delete future)
 * 6. Resolve reports (anonymize reporter, mark target reports as 'resolved')
 * 7. Delete block_list records
 * 8. Mark deletion_requests as 'completed' (or 'partially_completed' on storage failure)
 * 9. Create audit log entry
 *
 * Requirements: 3.1–3.10, 4.1–4.6, 9.4, 9.5, 12.2, 13.1–13.4
 */

const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Query all expired pending deletion requests
  const { data: expiredRequests, error: queryError } = await supabase
    .from('deletion_requests')
    .select('id, user_id')
    .eq('status', 'pending')
    .lte('grace_period_ends_at', new Date().toISOString());

  if (queryError) {
    console.error('Failed to query expired deletion requests:', queryError);
    return NextResponse.json(
      { error: 'Failed to query deletion requests', details: queryError.message },
      { status: 500 },
    );
  }

  if (!expiredRequests || expiredRequests.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No expired requests' });
  }

  const results: Array<{ requestId: string; userId: string; success: boolean; storageFailure: boolean; error?: string }> = [];

  // 2. Process each expired request
  for (const request of expiredRequests) {
    const result = await processHardDelete(supabase, request.id, request.user_id);
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    processed: results.length,
    successful,
    failed,
    results,
  });
}

async function processHardDelete(
  supabase: ReturnType<typeof createAdminClient>,
  requestId: string,
  userId: string,
) {
  let storageFailure = false;

  try {
    // ─── Step 1: Anonymize profile ─────────────────────────────────────────
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: 'Deleted User',
        email: null,
        age: null,
        city: null,
        city_id: null,
        country: null,
        languages: null,
        interests: null,
        bio: null,
        avatar_url: null,
        social_links: null,
        is_available: false,
        is_private: true,
      })
      .eq('id', userId);

    if (profileError) throw new Error(`Failed to anonymize profile: ${profileError.message}`);

    // ─── Step 2: Anonymize content ─────────────────────────────────────────
    const { error: reviewsError } = await supabase
      .from('event_reviews')
      .update({ user_id: SENTINEL_UUID })
      .eq('user_id', userId);
    if (reviewsError) throw new Error(`Failed to anonymize event_reviews: ${reviewsError.message}`);

    const { error: messagesError } = await supabase
      .from('messages')
      .update({ sender_id: SENTINEL_UUID })
      .eq('sender_id', userId);
    if (messagesError) throw new Error(`Failed to anonymize messages: ${messagesError.message}`);

    const { error: crewMessagesError } = await supabase
      .from('event_crew_messages')
      .update({ sender_id: SENTINEL_UUID })
      .eq('sender_id', userId)
      .eq('is_system', false);
    if (crewMessagesError) throw new Error(`Failed to anonymize event_crew_messages: ${crewMessagesError.message}`);

    const { error: commentsError } = await supabase
      .from('group_post_comments')
      .update({ user_id: SENTINEL_UUID })
      .eq('user_id', userId);
    if (commentsError) throw new Error(`Failed to anonymize group_post_comments: ${commentsError.message}`);

    // ─── Step 3: Delete storage files ──────────────────────────────────────
    try {
      const { data: avatarFiles } = await supabase.storage.from('avatars').list(userId);
      if (avatarFiles && avatarFiles.length > 0) {
        const { error } = await supabase.storage.from('avatars').remove(avatarFiles.map((f) => `${userId}/${f.name}`));
        if (error) { storageFailure = true; console.error(`Avatar delete failed for ${userId}:`, error); }
      }
    } catch { storageFailure = true; }

    try {
      const { data: photoFiles } = await supabase.storage.from('user-photos').list(userId);
      if (photoFiles && photoFiles.length > 0) {
        const { error } = await supabase.storage.from('user-photos').remove(photoFiles.map((f) => `${userId}/${f.name}`));
        if (error) { storageFailure = true; console.error(`Photo delete failed for ${userId}:`, error); }
      }
    } catch { storageFailure = true; }

    // Delete user_photos records
    const { error: photosDeleteError } = await supabase.from('user_photos').delete().eq('user_id', userId);
    if (photosDeleteError) throw new Error(`Failed to delete user_photos: ${photosDeleteError.message}`);

    // ─── Step 4: Delete personal records ───────────────────────────────────
    const { error: e1 } = await supabase.from('notifications').delete().eq('user_id', userId);
    if (e1) throw new Error(`Failed to delete notifications: ${e1.message}`);

    const { error: e2 } = await supabase.from('user_badges').delete().eq('user_id', userId);
    if (e2) throw new Error(`Failed to delete user_badges: ${e2.message}`);

    const { error: e3 } = await supabase.from('event_favorites').delete().eq('user_id', userId);
    if (e3) throw new Error(`Failed to delete event_favorites: ${e3.message}`);

    const { error: e4 } = await supabase.from('user_subscriptions').delete().eq('subscriber_id', userId);
    if (e4) throw new Error(`Failed to delete user_subscriptions (subscriber): ${e4.message}`);

    const { error: e5 } = await supabase.from('user_subscriptions').delete().eq('target_user_id', userId);
    if (e5) throw new Error(`Failed to delete user_subscriptions (target): ${e5.message}`);

    // ─── Step 5: Handle event_attendees ────────────────────────────────────
    const now = new Date().toISOString();
    const { data: attendeeRecords } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId);

    if (attendeeRecords && attendeeRecords.length > 0) {
      const eventIds = attendeeRecords.map((a) => a.event_id);

      // Past events: set user_id = NULL
      const { data: pastEvents } = await supabase.from('events').select('id').in('id', eventIds).lte('starts_at', now);
      if (pastEvents && pastEvents.length > 0) {
        const { error } = await supabase.from('event_attendees').update({ user_id: null }).eq('user_id', userId).in('event_id', pastEvents.map((e) => e.id));
        if (error) throw new Error(`Failed to nullify past event_attendees: ${error.message}`);
      }

      // Future events: delete records
      const { data: futureEvents } = await supabase.from('events').select('id').in('id', eventIds).gt('starts_at', now);
      if (futureEvents && futureEvents.length > 0) {
        const { error } = await supabase.from('event_attendees').delete().eq('user_id', userId).in('event_id', futureEvents.map((e) => e.id));
        if (error) throw new Error(`Failed to delete future event_attendees: ${error.message}`);
      }
    }

    // ─── Step 6: Resolve reports ───────────────────────────────────────────
    const { error: reporterErr } = await supabase.from('reports').update({ reporter_id: SENTINEL_UUID }).eq('reporter_id', userId);
    if (reporterErr) throw new Error(`Failed to anonymize reporter: ${reporterErr.message}`);

    const { error: targetErr } = await supabase.from('reports').update({ status: 'resolved', resolved_at: now, description: 'Account deleted' }).eq('target_id', userId).eq('target_type', 'user');
    if (targetErr) throw new Error(`Failed to resolve target reports: ${targetErr.message}`);

    // ─── Step 7: Delete block-list records ─────────────────────────────────
    const { error: b1 } = await supabase.from('blocked_users').delete().eq('blocker_id', userId);
    if (b1) throw new Error(`Failed to delete blocked_users (blocker): ${b1.message}`);

    const { error: b2 } = await supabase.from('blocked_users').delete().eq('blocked_id', userId);
    if (b2) throw new Error(`Failed to delete blocked_users (blocked): ${b2.message}`);

    // ─── Step 8: Mark deletion_requests as completed ───────────────────────
    const finalStatus = storageFailure ? 'partially_completed' : 'completed';
    const { error: updateErr } = await supabase
      .from('deletion_requests')
      .update({ status: finalStatus, completed_at: new Date().toISOString() })
      .eq('id', requestId);
    if (updateErr) throw new Error(`Failed to update deletion_request: ${updateErr.message}`);

    // ─── Step 9: Audit log ─────────────────────────────────────────────────
    await supabase.from('admin_audit_log').insert({
      actor_id: null,
      actor_email_snapshot: 'system:hard-delete-cron',
      action: 'deletion_completed',
      target_type: 'profile',
      target_id: userId,
      metadata: { deletion_request_id: requestId, status: finalStatus, storage_failure: storageFailure },
    });

    return { requestId, userId, success: true, storageFailure };
  } catch (error) {
    console.error(`Hard delete failed for user ${userId}:`, error);
    return { requestId, userId, success: false, storageFailure, error: error instanceof Error ? error.message : String(error) };
  }
}
