import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateUserCalendarFeed } from '@/lib/actions/calendar';

/**
 * Personal calendar feed: returns every event the user organises or
 * RSVP'd "going" / "waitlist" to as an .ics calendar. Authenticated by
 * the per-user `calendar_token` query string so external clients
 * (Google Calendar, Apple Calendar, Outlook) can subscribe without a
 * session.
 *
 * Subscribe URLs look like:
 *   webcal://localisio.com/api/calendar/me/ical?token=...
 *
 * Cache headers are conservative: most calendar clients re-fetch every
 * few hours, but we still allow the CDN to cache for 5 minutes per
 * token, balancing freshness for newly-RSVPed events with load.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('calendar_token', token)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const ical = await generateUserCalendarFeed(
    profile.id,
    profile.display_name,
    supabase,
  );

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': 'inline; filename="localisio.ics"',
    },
  });
}
