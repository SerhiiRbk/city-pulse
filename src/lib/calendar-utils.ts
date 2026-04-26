/**
 * Calendar utilities that are safe to run on both client and server —
 * pure URL/string builders, no Supabase or Node.js APIs. Server-only
 * iCalendar generation lives in `lib/actions/calendar.ts`.
 */

/**
 * Builds a Google Calendar "Add to calendar" deep-link. No OAuth — the
 * visitor lands on a prefilled event creation page and saves with one
 * click. Works for any Google account.
 *
 * Reference shape:
 *   https://calendar.google.com/calendar/render?action=TEMPLATE
 *     &text=<title>&dates=<start>/<end>&details=<desc>&location=<addr>
 */
export function buildGoogleCalendarUrl(event: {
  title: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  starts_at: string;
  duration_minutes: number;
  is_online?: boolean;
}): string {
  const start = new Date(event.starts_at);
  const end = new Date(
    start.getTime() + (event.duration_minutes || 60) * 60 * 1000,
  );
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dates = `${fmt(start)}/${fmt(end)}`;
  const location = [event.address, event.city].filter(Boolean).join(', ');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
  });
  if (event.description) params.set('details', event.description);
  if (location) params.set('location', location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
