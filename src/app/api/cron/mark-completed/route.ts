import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hourly cron: flip `published` events whose end time has already passed
 * to `completed`. Keeps the lifecycle in sync without forcing every
 * organizer to manually mark the event done.
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
  const nowIso = new Date().toISOString();

  // Cap each run so a backlog can't blow past statement timeouts. The
  // cron schedules hourly, so up to 500 events / hour is plenty.
  const { data: dueEvents, error: selectError } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'published')
    .lt('ends_at', nowIso)
    .limit(500);

  if (selectError) {
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 },
    );
  }

  if (!dueEvents || dueEvents.length === 0) {
    return NextResponse.json({ success: true, marked: 0 });
  }

  const ids = dueEvents.map((e) => e.id);
  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'completed', updated_at: nowIso })
    .in('id', ids);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, marked: ids.length });
}
