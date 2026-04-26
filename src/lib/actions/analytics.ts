'use server';

import { createClient } from '@/lib/supabase/server';

export async function trackEvent(eventName: string, properties: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('analytics_events').insert({
    event_name: eventName,
    user_id: user?.id || null,
    properties,
  });
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalEvents },
    { count: totalGroups },
    { count: activeEventsCount },
    { count: newUsersLast30 },
    { data: recentSignups },
    { data: topEvents },
    { data: pendingReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      // Count events that haven't ended yet (consistent with discovery surfaces).
      .gte('ends_at', now.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('profiles')
      .select('id, display_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('events_with_counts')
      .select('id, title, going_count, starts_at, city')
      .eq('status', 'published')
      .gte('ends_at', now.toISOString())
      .order('going_count', { ascending: false })
      .limit(5),
    supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    totalUsers: totalUsers || 0,
    totalEvents: totalEvents || 0,
    totalGroups: totalGroups || 0,
    activeEvents: activeEventsCount || 0,
    newUsersLast30: newUsersLast30 || 0,
    recentSignups: recentSignups || [],
    topEvents: topEvents || [],
    pendingReports: pendingReports || [],
    today,
  };
}

export async function getDailyStats(metric: string, days = 30) {
  const supabase = await createClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('metric', metric)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  return data || [];
}
