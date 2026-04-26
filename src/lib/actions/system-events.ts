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
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = await createClient();
  const limit = filters.limit || 12;
  const offset = filters.offset || 0;
  const now = new Date().toISOString();

  let query = supabase
    .from('events_with_counts')
    .select('*')
    .eq('is_system', true)
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    // Keep ongoing system events visible until they end.
    .gte('ends_at', now)
    .order('starts_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters.city) query = query.eq('city', filters.city);

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
