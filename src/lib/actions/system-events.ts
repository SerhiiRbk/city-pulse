'use server';

import { createClient } from '@/lib/supabase/server';

export async function createSystemEvent(data: {
  title: string;
  description: string;
  source_url?: string;
  starts_at: string;
  duration_minutes: number;
  country?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
  is_free: boolean;
  price?: number;
  currency?: string;
  category_id?: string;
  photos?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return { error: 'Insufficient permissions' };
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...data,
      organizer_id: user.id,
      is_system: true,
      is_online: false,
      is_private: false,
      status: 'published',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, event };
}

export async function getSystemEvents(filters: {
  city?: string;
  city_id?: string;
  country?: string;
  /** ISO date (YYYY-MM-DD) or full ISO timestamp. Filters `starts_at >= from`. */
  date_from?: string;
  /** ISO date (YYYY-MM-DD) or full ISO timestamp. Filters `starts_at <= to`. */
  date_to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = await createClient();
  const limit = filters.limit || 12;
  const offset = filters.offset || 0;

  let query = supabase
    .from('events_with_counts')
    .select('*')
    .eq('is_system', true)
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('starts_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters.city_id) {
    query = query.eq('city_id', filters.city_id);
  } else if (filters.city) {
    query = query.eq('city', filters.city);
  } else if (filters.country) {
    query = query.eq('country', filters.country);
  }

  // Date-range filters take precedence over the "ongoing & future" default.
  // Plain YYYY-MM-DD strings are inflated to start/end of day so the user
  // gets the inclusive window they expect (e.g. `from=2026-05-04` matches
  // an event at 2026-05-04T20:00:00Z).
  const expandFrom = (s: string) => (s.length === 10 ? `${s}T00:00:00Z` : s);
  const expandTo = (s: string) => (s.length === 10 ? `${s}T23:59:59Z` : s);

  if (filters.date_from || filters.date_to) {
    if (filters.date_from) query = query.gte('starts_at', expandFrom(filters.date_from));
    if (filters.date_to) query = query.lte('starts_at', expandTo(filters.date_to));
  } else {
    // No explicit window — keep ongoing events visible until they end.
    query = query.gte('ends_at', new Date().toISOString());
  }

  const { data } = await query;
  return data || [];
}

export async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}
