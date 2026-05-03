'use server';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * Returned by {@link getEventFunnel} / {@link getOrganizerFunnel}.
 *
 * Conversion rates are nullable: when the prior step in the funnel
 * is zero we surface `null` rather than `0%` so the UI can render
 * "—" and avoid implying that the rate is meaningfully bad.
 */
export interface EventFunnelRow {
  event_id: string;
  title: string;
  starts_at: string;
  status: string;
  views_total: number;
  views_30d: number;
  views_7d: number;
  unique_viewers: number;
  going_count: number;
  attended_count: number;
  no_show_count: number;
  view_to_rsvp_rate: number | null;
  rsvp_to_attended_rate: number | null;
}

/**
 * Records a single, de-duplicated event-detail view.
 *
 * Called from the server component that renders the event detail
 * page. We:
 *   1. Resolve the viewer (auth user if signed-in, otherwise we
 *      compute a daily session hash from `x-forwarded-for` + `user-
 *      agent` so the headcount isn't inflated by refresh-spamming).
 *   2. Defer to the `record_event_view` SQL function which does an
 *      `ON CONFLICT DO NOTHING` upsert keyed by `(event_id,
 *      viewer-identity, day_bucket)`.
 *
 * This intentionally never throws — analytics misses must never
 * break a page render.
 */
export async function recordEventView(eventId: string): Promise<void> {
  if (!eventId) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let sessionHash: string | null = null;
    if (!user) {
      const headerStore = await headers();
      // We never persist the raw inputs — only the salted hash.
      const ip =
        headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headerStore.get('x-real-ip') ||
        '';
      const ua = headerStore.get('user-agent') || '';
      const day = new Date().toISOString().slice(0, 10);
      // Empty inputs would collapse every anon viewer into one
      // bucket; skip the call instead of polluting the funnel.
      if (ip || ua) {
        sessionHash = createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex');
      }
    }

    await supabase.rpc('record_event_view', {
      p_event_id: eventId,
      p_user_id: user?.id ?? null,
      p_session_hash: sessionHash,
    });
  } catch {
    // Analytics failures must never bubble up to the user.
  }
}

/**
 * Returns the funnel row for a single event. Callers must hold an
 * editorial role on the event (organiser, moderator, or site staff)
 * — RLS on the underlying view enforces this.
 */
export async function getEventFunnel(eventId: string): Promise<EventFunnelRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_funnel')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) return null;
  return data as EventFunnelRow | null;
}

/**
 * Lists funnels for events the caller can edit.
 *
 * Used by:
 *   • `/profile/events` (organiser self-view) — implicit organizer_id
 *     filter via RLS;
 *   • the admin dashboard, where we order by views_30d to surface
 *     the highest-traffic events that nonetheless aren't converting.
 */
export async function listEventFunnels(opts: {
  organizerId?: string;
  limit?: number;
  status?: 'published' | 'draft' | 'cancelled' | 'completed';
} = {}): Promise<EventFunnelRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('event_funnel')
    .select('*')
    .order('views_30d', { ascending: false, nullsFirst: false })
    .order('starts_at', { ascending: false });

  if (opts.organizerId) query = query.eq('organizer_id', opts.organizerId);
  if (opts.status) query = query.eq('status', opts.status);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as EventFunnelRow[];
}
