import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const rpcResult = await supabase.rpc('count_active_users_today');
  const dau = rpcResult.data || 0;

  const [
    { count: totalUsers },
    { count: newSignups },
    { count: publishedEvents },
    { count: newAttendees },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('event_attendees').select('*', { count: 'exact', head: true }).gte('joined_at', `${today}T00:00:00`),
  ]);

  const metrics = [
    { metric: 'dau', value: dau || 0 },
    { metric: 'total_users', value: totalUsers || 0 },
    { metric: 'new_signups', value: newSignups || 0 },
    { metric: 'published_events', value: publishedEvents || 0 },
    { metric: 'new_attendees', value: newAttendees || 0 },
  ];

  for (const m of metrics) {
    await supabase.from('daily_stats').upsert(
      { date: today, metric: m.metric, value: m.value },
      { onConflict: 'date,metric' },
    );
  }

  return NextResponse.json({ success: true, date: today, metrics });
}
