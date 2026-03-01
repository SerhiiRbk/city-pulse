'use server';

import { createClient } from '@/lib/supabase/server';

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { start, end };
}

function tomorrowRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
  return { start, end };
}

function weekendRange() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSat);
  const monday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 2);
  return { start: saturday.toISOString(), end: monday.toISOString() };
}

async function fetchEvents(dateStart: string, dateEnd: string, limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .gte('starts_at', dateStart)
    .lt('starts_at', dateEnd)
    .order('going_count', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getTodayEvents(limit = 6) {
  const { start, end } = todayRange();
  return fetchEvents(start, end, limit);
}

export async function getTomorrowEvents(limit = 6) {
  const { start, end } = tomorrowRange();
  return fetchEvents(start, end, limit);
}

export async function getWeekendEvents(limit = 6) {
  const { start, end } = weekendRange();
  return fetchEvents(start, end, limit);
}

export async function getPopularEvents(limit = 6) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .gte('starts_at', now)
    .order('going_count', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getTopGroups(limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('groups_with_counts')
    .select('*')
    .order('member_count', { ascending: false })
    .limit(limit);
  return data || [];
}
