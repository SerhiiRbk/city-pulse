import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hourly cron: archive active crews whose associated event ended more
 * than 14 days ago. Keeps the system clean while preserving crew
 * history in read-only mode.
 *
 * Logic:
 * 1. SELECT event_crews WHERE status = 'active'
 *    AND event.ends_at + interval '14 days' < now()
 * 2. UPDATE matched crews SET status = 'archived', archived_at = now()
 * 3. Return count of archived crews
 *
 * Batched to 500 per run to avoid statement timeouts.
 *
 * Auth: shared secret in the `Authorization` header (matches Vercel cron
 * convention). Configured via `CRON_SECRET` env var.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();
  const nowIso = now.toISOString();

  // Find active crews whose event ended more than 14 days ago.
  // We join through the events table via the event_id foreign key.
  const { data: dueCrews, error: selectError } = await supabase
    .from('event_crews')
    .select('id, events!inner(ends_at)')
    .eq('status', 'active')
    .lt('events.ends_at', cutoffIso)
    .limit(500);

  if (selectError) {
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 },
    );
  }

  if (!dueCrews || dueCrews.length === 0) {
    return NextResponse.json({ success: true, archived: 0 });
  }

  const ids = dueCrews.map((c) => c.id);

  const { error: updateError } = await supabase
    .from('event_crews')
    .update({
      status: 'archived',
      archived_at: nowIso,
      updated_at: nowIso,
    })
    .in('id', ids);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, archived: ids.length });
}
