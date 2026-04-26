import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Hourly cron that drives event-lifecycle notifications:
 *
 *   1. **24h start reminder** — for every published event whose
 *      `starts_at` falls in the next ~24 hours, notify each RSVP that
 *      hasn't yet received the `event_reminder_24h` notification.
 *      Idempotent because we filter out users who already have a row of
 *      that type for that event.
 *
 *   2. **Recap reminder** — for every event that ended in the last
 *      ~48 hours and doesn't yet have a recap group post, ping the
 *      organiser once with `event_recap_reminder`. Encourages reflection
 *      while the event is still fresh.
 *
 * Auth: shared `CRON_SECRET` bearer matching Vercel cron config.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 1h safety overlap so events crossing the cron tick still get reminders.
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const past1h = new Date(now.getTime() - 60 * 60 * 1000);

  let remindersInserted = 0;
  let recapInserted = 0;

  // ---- 1. 24h reminders ----------------------------------------------
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('status', 'published')
    .gte('starts_at', now.toISOString())
    .lt('starts_at', in25h.toISOString())
    .limit(200);

  if (upcomingEvents && upcomingEvents.length > 0) {
    for (const event of upcomingEvents) {
      // Skip events further than 24h+epsilon away — only process the
      // ones really within the next ~24h window.
      if (new Date(event.starts_at) > in24h) continue;

      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['going', 'waitlist']);

      if (!attendees || attendees.length === 0) continue;

      const userIds = attendees.map((a) => a.user_id);

      // Filter out users that already received this reminder for this
      // event. With the partial index from mig 040 this stays cheap.
      const { data: alreadyNotified } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', 'event_reminder_24h')
        .eq('data->>event_id', event.id)
        .in('user_id', userIds);

      const notifiedSet = new Set(
        (alreadyNotified ?? []).map((row) => row.user_id),
      );
      const targets = userIds.filter((id) => !notifiedSet.has(id));
      if (targets.length === 0) continue;

      const rows = targets.map((userId) => ({
        user_id: userId,
        type: 'event_reminder_24h' as const,
        title: `${event.title} — starts tomorrow`,
        body: 'Your event starts in less than 24 hours.',
        data: { event_id: event.id },
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(rows);

      if (!insertError) remindersInserted += rows.length;
    }
  }

  // ---- 2. Recap reminders --------------------------------------------
  const { data: endedEvents } = await supabase
    .from('events')
    .select('id, title, organizer_id, ends_at')
    .in('status', ['published', 'completed'])
    .gte('ends_at', past48h.toISOString())
    .lt('ends_at', past1h.toISOString())
    .limit(200);

  if (endedEvents && endedEvents.length > 0) {
    for (const event of endedEvents) {
      // Skip if a recap post already exists for this event.
      const { count: recapCount } = await supabase
        .from('group_posts')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('type', 'event_recap');

      if ((recapCount ?? 0) > 0) continue;

      // Skip if we already nudged this organizer for this event.
      const { count: existingNudge } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'event_recap_reminder')
        .eq('user_id', event.organizer_id)
        .eq('data->>event_id', event.id);

      if ((existingNudge ?? 0) > 0) continue;

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: event.organizer_id,
          type: 'event_recap_reminder',
          title: `Share a recap of ${event.title}`,
          body:
            'Tell your community how the event went — recaps boost group engagement.',
          data: { event_id: event.id },
        });

      if (!insertError) recapInserted += 1;
    }
  }

  return NextResponse.json({
    success: true,
    remindersInserted,
    recapInserted,
  });
}
