import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Daily cron (runs at 10:00 UTC): sends follow-up notifications to
 * attendees of events that ended yesterday. Encourages them to:
 * - Check out similar upcoming events
 * - Join the group if the event was organized by one
 * - Add people they met to contacts
 *
 * Only notifies users who actually attended (status = 'going' or 'attended').
 * Skips system events (Afisha) — those are passive listings.
 *
 * Auth: shared secret in the `Authorization` header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find events that ended yesterday (between 24h and 48h ago)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const { data: recentEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, title, category_id, group_id, organizer_id')
    .eq('status', 'completed')
    .eq('is_system', false)
    .gte('ends_at', dayBefore.toISOString())
    .lt('ends_at', yesterday.toISOString())
    .limit(100);

  if (eventsError || !recentEvents || recentEvents.length === 0) {
    return NextResponse.json({
      ok: true,
      eventsProcessed: 0,
      notificationsSent: 0,
    });
  }

  let notificationsSent = 0;

  for (const event of recentEvents) {
    // Get attendees who went
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', event.id)
      .in('status', ['going', 'attended']);

    if (!attendees || attendees.length === 0) continue;

    // Find similar upcoming events (same category, next 7 days)
    let similarCount = 0;
    if (event.category_id) {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', event.category_id)
        .eq('status', 'published')
        .gte('starts_at', now.toISOString())
        .lte('starts_at', nextWeek.toISOString())
        .neq('id', event.id);
      similarCount = count ?? 0;
    }

    // Build notification
    const hasGroup = !!event.group_id;
    const body = similarCount > 0
      ? `Enjoyed "${event.title}"? There are ${similarCount} similar events this week. Add people you met to contacts to stay in touch.`
      : hasGroup
        ? `Enjoyed "${event.title}"? Stay connected — add people you met to contacts or check the group for the next meetup.`
        : `Enjoyed "${event.title}"? Add people you met to contacts to stay in touch and plan the next outing.`;

    const notifications = attendees
      .filter((a) => a.user_id !== event.organizer_id)
      .map((a) => ({
        user_id: a.user_id,
        type: 'post_event_followup' as const,
        title: 'How was it?',
        body,
        data: {
          event_id: event.id,
          category_id: event.category_id,
          similar_count: similarCount,
        },
      }));

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (!insertError) {
        notificationsSent += notifications.length;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    eventsProcessed: recentEvents.length,
    notificationsSent,
  });
}
