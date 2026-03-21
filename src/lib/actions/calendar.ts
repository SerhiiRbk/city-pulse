'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCalendarEvents(year: number, month: number) {
  const supabase = await createClient();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const { data } = await supabase
    .from('events_with_counts')
    .select('id, title, starts_at, city, is_online, is_free, going_count, category_slug, photos')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .gte('starts_at', start)
    .lt('starts_at', end)
    .order('starts_at');

  return data || [];
}

export async function getMyCalendarEvents(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const { data: attending } = await supabase
    .from('event_attendees')
    .select('event_id')
    .eq('user_id', user.id)
    .eq('status', 'going');

  if (!attending || attending.length === 0) return [];

  const eventIds = attending.map((a) => a.event_id);

  const { data } = await supabase
    .from('events_with_counts')
    .select('id, title, starts_at, city, is_online, is_free, going_count, category_slug, photos')
    .in('id', eventIds)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .gte('starts_at', start)
    .lt('starts_at', end)
    .order('starts_at');

  return data || [];
}

export async function generateICalEvent(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!event) return null;

  const start = new Date(event.starts_at);
  const end = new Date(start.getTime() + (event.duration_minutes || 60) * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//City-Pulse//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    event.address ? `LOCATION:${event.address}` : '',
    `UID:${event.id}@city-pulse`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return ical;
}
