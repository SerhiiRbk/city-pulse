import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Companion to `/api/cron/rsvp-reconfirm`. Once a 'going' attendee
 * has been asked to reconfirm and remained silent for the grace
 * window, we flip their RSVP to `cancelled` so the waitlist can
 * promote in their place. The AFTER trigger from migration 035 does
 * the actual promotion, so this endpoint just needs to update the
 * stale rows.
 *
 * Window:
 *   * `reconfirm_sent_at` is older than 8h (gives users a workday
 *     to respond from a phone notification).
 *   * `confirmed` is still false.
 *   * Event hasn't started yet.
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
  const cutoff = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  // We need event ids whose start_at is still in the future. Going
  // through `events` first lets us filter cheaply on a date column,
  // then we cancel matching attendee rows in a single update.
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'published')
    .gte('starts_at', now.toISOString())
    .limit(500);

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, releasedRows: 0 });
  }

  const eventIds = events.map((e) => e.id);

  const { count: releasedRows, error } = await supabase
    .from('event_attendees')
    .update({ status: 'cancelled' }, { count: 'exact' })
    .in('event_id', eventIds)
    .eq('status', 'going')
    .eq('confirmed', false)
    .not('reconfirm_sent_at', 'is', null)
    .lt('reconfirm_sent_at', cutoff.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, releasedRows: releasedRows ?? 0 });
}
