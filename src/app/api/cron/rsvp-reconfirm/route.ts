import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hourly cron that fires the 24h "still coming?" prompt for events
 * with capacity. The flow:
 *
 *   1. Find events whose start_at falls 22-26h in the future and
 *      that have a `max_attendees` cap (uncapped events have no
 *      waitlist pressure, so the prompt would be needless friction).
 *   2. For each such event, find every `going` attendee whose
 *      `reconfirm_sent_at` is NULL (we haven't asked yet) and that
 *      hasn't already confirmed via `confirmed = true`.
 *   3. Insert a `rsvp_reconfirm_24h` notification per user and
 *      stamp `reconfirm_sent_at = now()` on the attendee row so the
 *      next cron run skips it.
 *
 * The companion endpoint `rsvp-auto-release` (separate route) handles
 * the second pass: actually cancelling stale `going` rows whose owner
 * never confirmed. We split them so the prompt can roll out without
 * the auto-cancel side-effect, controlled by a feature flag.
 *
 * Auth: shared `CRON_SECRET` bearer matching Vercel cron config.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in22h = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  // 1. Capacity-bounded events in the 22-26h window. The 4h window
  // (vs the 24h reminder's 1h overlap) gives the prompt some slack
  // because the auto-release pass needs at least a few hours to
  // accumulate confirmations.
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, starts_at, max_attendees')
    .eq('status', 'published')
    .gte('starts_at', in22h.toISOString())
    .lt('starts_at', in26h.toISOString())
    .not('max_attendees', 'is', null)
    .limit(200);

  let promptsSent = 0;

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return NextResponse.json({ success: true, promptsSent: 0 });
  }

  for (const event of upcomingEvents) {
    // Pending = going + never asked + not yet confirmed.
    const { data: pending } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('status', 'going')
      .is('reconfirm_sent_at', null)
      .eq('confirmed', false);

    if (!pending || pending.length === 0) continue;

    const userIds = pending.map((row) => row.user_id);

    const rows = userIds.map((userId) => ({
      user_id: userId,
      type: 'rsvp_reconfirm_24h' as const,
      title: `${event.title} — confirm you're coming`,
      body:
        'Tap to confirm your spot. Unconfirmed RSVPs may be released so the waitlist can take over.',
      data: { event_id: event.id },
    }));

    const { error: insertErr } = await supabase.from('notifications').insert(rows);
    if (insertErr) continue;

    // Mark all rows in one shot — `update ... in (...)` is a single
    // round-trip and avoids n+1 with the user list.
    const { error: stampErr } = await supabase
      .from('event_attendees')
      .update({ reconfirm_sent_at: now.toISOString() })
      .eq('event_id', event.id)
      .in('user_id', userIds);

    if (!stampErr) promptsSent += rows.length;
  }

  return NextResponse.json({ success: true, promptsSent });
}
