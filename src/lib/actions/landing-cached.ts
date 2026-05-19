import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

const LANDING_CACHE = { stale: 60, revalidate: 120, expire: 900 };

/** Check if a city has at least 1 upcoming event or group. */
export async function cityHasContent(cityDbName: string): Promise<boolean> {
  'use cache';
  cacheTag('landing:city-check');
  cacheLife(LANDING_CACHE);

  const supabase = createPublicClient();
  const sinceIso = new Date().toISOString();

  const { count } = await supabase
    .from('events_with_counts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .gte('ends_at', sinceIso)
    .eq('city', cityDbName)
    .limit(1);

  return (count ?? 0) > 0;
}

export async function getCachedLandingEvents(limit = 24, city?: string) {
  'use cache';
  cacheTag('landing:events');
  cacheLife(LANDING_CACHE);

  const sinceIso = new Date().toISOString();
  const supabase = createPublicClient();
  let query = supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    // Hide finished events but keep currently in-progress ones visible.
    .gte('ends_at', sinceIso);

  if (city) {
    query = query.eq('city', city);
  }

  const { data } = await query
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

  const [eventsRes, groupsRes, membersRes, groupCitiesRes, eventCitiesRes] = await Promise.all([
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
    supabase
      .from('events')
      .select('city')
      .eq('status', 'published')
      .eq('is_private', false)
      .eq('is_blocked', false)
      .gte('ends_at', nowIso)
      .not('city', 'is', null),
  ]);

  // Combine unique cities from both groups and events
  const citySet = new Set<string>();
  for (const row of groupCitiesRes.data ?? []) {
    const cityId = (row as { city_id: string | null }).city_id;
    if (cityId) citySet.add(cityId);
  }
  for (const row of eventCitiesRes.data ?? []) {
    const city = (row as { city: string | null }).city;
    if (city) citySet.add(city);
  }

  return {
    events: eventsRes.count ?? 0,
    groups: groupsRes.count ?? 0,
    members: membersRes.count ?? 0,
    cities: citySet.size,
  };
}
