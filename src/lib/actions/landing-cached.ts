import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

const LANDING_CACHE = { stale: 60, revalidate: 120, expire: 900 };

export async function getCachedLandingEvents(limit = 24) {
  'use cache';
  cacheTag('landing:events');
  cacheLife(LANDING_CACHE);

  const sinceIso = new Date().toISOString();
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    // Hide finished events but keep currently in-progress ones visible.
    .gte('ends_at', sinceIso)
    .order('starts_at', { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getCachedLandingTopGroups(limit = 4) {
  'use cache';
  cacheTag('landing:groups');
  cacheLife(LANDING_CACHE);

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('groups_with_counts')
    .select('*')
    .eq('is_blocked', false)
    .eq('creator_is_blocked', false)
    .order('member_count', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type LandingStats = {
  events: number;
  groups: number;
  members: number;
  cities: number;
};

export async function getCachedLandingStats(): Promise<LandingStats> {
  'use cache';
  cacheTag('landing:stats');
  cacheLife({ stale: 300, revalidate: 1800, expire: 86_400 });

  const supabase = createPublicClient();
  const nowIso = new Date().toISOString();

  const [eventsRes, groupsRes, membersRes, groupCitiesRes] = await Promise.all([
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('is_private', false)
      .eq('is_blocked', false)
      // Count events that haven't ended yet (includes in-progress).
      .gte('ends_at', nowIso),
    supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('is_blocked', false),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_blocked', false),
    supabase
      .from('groups')
      .select('city_id')
      .eq('is_blocked', false)
      .not('city_id', 'is', null),
  ]);

  const citySet = new Set(
    (groupCitiesRes.data ?? [])
      .map((row) => (row as { city_id: string | null }).city_id)
      .filter(Boolean),
  );

  return {
    events: eventsRes.count ?? 0,
    groups: groupsRes.count ?? 0,
    members: membersRes.count ?? 0,
    cities: citySet.size,
  };
}
