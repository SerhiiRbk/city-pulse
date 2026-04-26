'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
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

/**
 * Escapes a single iCalendar TEXT-property value per RFC 5545 §3.3.11.
 * Backslashes, commas, semicolons, and newlines all need encoding so
 * that calendar clients render the field instead of breaking the parse.
 */
function escapeIcsText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

type IcalEvent = {
  id: string;
  title: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  starts_at: string;
  duration_minutes: number;
  status?: string | null;
  updated_at?: string | null;
  is_online?: boolean;
};

/**
 * Builds a single VEVENT block. Status maps to RFC 5545 STATUS values
 * so cancellations propagate to subscribed calendars (Google honours
 * STATUS:CANCELLED on a subscribed feed and dims the event).
 */
function buildVEvent(event: IcalEvent, baseUrl: string): string {
  const start = new Date(event.starts_at);
  const end = new Date(
    start.getTime() + (event.duration_minutes || 60) * 60 * 1000,
  );

  const status =
    event.status === 'cancelled'
      ? 'CANCELLED'
      : event.status === 'completed'
        ? 'CONFIRMED'
        : 'CONFIRMED';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@city-pulse`,
    `DTSTAMP:${formatIcsDate(new Date(event.updated_at || event.starts_at))}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description || '')}`,
    event.address || event.city
      ? `LOCATION:${escapeIcsText([event.address, event.city].filter(Boolean).join(', '))}`
      : '',
    `URL:${baseUrl}/events/${event.id}`,
    `STATUS:${status}`,
    'END:VEVENT',
  ];

  return lines.filter(Boolean).join('\r\n');
}

function wrapCalendar(
  vevents: string[],
  options: { calName?: string; calDescription?: string } = {},
): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//City-Pulse//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (options.calName) {
    header.push(`X-WR-CALNAME:${escapeIcsText(options.calName)}`);
    header.push(`NAME:${escapeIcsText(options.calName)}`);
  }
  if (options.calDescription) {
    header.push(`X-WR-CALDESC:${escapeIcsText(options.calDescription)}`);
  }
  return [...header, ...vevents, 'END:VCALENDAR'].join('\r\n');
}

export async function generateICalEvent(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('events')
    .select('id, title, description, address, city, starts_at, duration_minutes, status, updated_at, is_online')
    .eq('id', eventId)
    .single();

  if (!event) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://city-pulse.app';
  const vevent = buildVEvent(event as IcalEvent, baseUrl);
  return wrapCalendar([vevent], { calName: event.title });
}

/**
 * Builds a personal feed for a user — every event they organise plus
 * every event they RSVP'd "going" to. Used by the subscribe URL exposed
 * via `/api/calendar/me/ical?token=...`.
 */
export async function generateUserCalendarFeed(
  userId: string,
  displayName: string | null,
  /**
   * Optional client override. Calendar feeds are fetched with no
   * Supabase session (subscription URLs are anonymous), so the route
   * passes its admin client here to bypass RLS for the legitimate user.
   */
  client?: SupabaseClient,
): Promise<string> {
  const supabase = client ?? (await createClient());
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://city-pulse.app';

  // Cap the window so subscribed feeds stay snappy: from 30 days ago
  // (recent recap visible) through ~2 years ahead.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date(
    Date.now() + 2 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [organizedRes, attendingIdsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, description, address, city, starts_at, duration_minutes, status, updated_at, is_online')
      .eq('organizer_id', userId)
      .gte('starts_at', since)
      .lte('starts_at', until),
    supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId)
      .in('status', ['going', 'waitlist']),
  ]);

  const organizedIds = new Set(
    (organizedRes.data ?? []).map((row) => row.id),
  );
  const attendingEventIds = (attendingIdsRes.data ?? [])
    .map((row) => row.event_id)
    .filter((id): id is string => Boolean(id) && !organizedIds.has(id));

  let attending: IcalEvent[] = [];
  if (attendingEventIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, address, city, starts_at, duration_minutes, status, updated_at, is_online')
      .in('id', attendingEventIds)
      .gte('starts_at', since)
      .lte('starts_at', until);
    attending = (data ?? []) as IcalEvent[];
  }

  const all = [
    ...((organizedRes.data ?? []) as IcalEvent[]),
    ...attending,
  ].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const vevents = all.map((event) => buildVEvent(event, baseUrl));

  return wrapCalendar(vevents, {
    calName: displayName ? `${displayName} — City-Pulse` : 'City-Pulse',
    calDescription:
      'Events you organise or RSVP to on City-Pulse. Updates automatically.',
  });
}

