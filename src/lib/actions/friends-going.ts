'use server';

import { createClient } from '@/lib/supabase/server';

export interface FriendGoing {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'going' | 'waitlist' | 'interested';
}

/**
 * Returns up to `max` people the current viewer follows
 * (`user_subscriptions.target_user_id`) who have an RSVP on the
 * given event. Sorted: going > waitlist > interested, then by
 * RSVP timestamp ascending (earliest committed first).
 *
 * Returns [] for anonymous viewers — there's nothing useful to
 * say without an identity to compare against. Callers should
 * gate on auth before calling.
 */
export async function getFriendsGoing(
  eventId: string,
  max = 5,
): Promise<FriendGoing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // We pull the viewer's follow graph and the event's RSVPs in
  // one round-trip via two `select`s, then intersect locally —
  // this avoids a join across two policy domains and stays well
  // under the row-count where a more clever SQL would help.
  const [{ data: follows }, { data: attendees }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('target_user_id')
      .eq('subscriber_id', user.id),
    supabase
      .from('event_attendees')
      .select('user_id, status, created_at')
      .eq('event_id', eventId)
      .in('status', ['going', 'waitlist', 'interested']),
  ]);

  if (!follows || !attendees || follows.length === 0 || attendees.length === 0) {
    return [];
  }

  const followSet = new Set(follows.map((f) => f.target_user_id));
  const overlap = attendees.filter((a) => followSet.has(a.user_id));
  if (overlap.length === 0) return [];

  // Stable ordering for the "you know X" cue.
  const statusWeight: Record<string, number> = {
    going: 0,
    waitlist: 1,
    interested: 2,
  };
  overlap.sort((a, b) => {
    const sw = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
    if (sw !== 0) return sw;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const trimmed = overlap.slice(0, max);
  const userIds = trimmed.map((row) => row.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    });
  }

  return trimmed.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      user_id: row.user_id,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      status: row.status as FriendGoing['status'],
    };
  });
}

/**
 * Bulk variant for cards on /events. Takes a list of event ids
 * and returns a map `{ eventId → FriendGoing[] }` (max 3 per
 * event by default — anything more crowds the card UI).
 */
export async function getFriendsGoingBulk(
  eventIds: string[],
  perEvent = 3,
): Promise<Record<string, FriendGoing[]>> {
  const out: Record<string, FriendGoing[]> = {};
  if (eventIds.length === 0) return out;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return out;

  const [{ data: follows }, { data: attendees }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('target_user_id')
      .eq('subscriber_id', user.id),
    supabase
      .from('event_attendees')
      .select('event_id, user_id, status, created_at')
      .in('event_id', eventIds)
      .in('status', ['going', 'waitlist', 'interested']),
  ]);

  if (!follows || !attendees || follows.length === 0 || attendees.length === 0) {
    return out;
  }

  const followSet = new Set(follows.map((f) => f.target_user_id));
  const overlap = attendees.filter((a) => followSet.has(a.user_id));
  if (overlap.length === 0) return out;

  const allUserIds = Array.from(new Set(overlap.map((row) => row.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', allUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
  );

  const grouped = new Map<string, typeof overlap>();
  for (const row of overlap) {
    const list = grouped.get(row.event_id) ?? [];
    list.push(row);
    grouped.set(row.event_id, list);
  }

  const statusWeight: Record<string, number> = {
    going: 0,
    waitlist: 1,
    interested: 2,
  };

  for (const [eventId, rows] of grouped) {
    rows.sort((a, b) => {
      const sw = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
      if (sw !== 0) return sw;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    out[eventId] = rows.slice(0, perEvent).map((row) => {
      const profile = profileMap.get(row.user_id);
      return {
        user_id: row.user_id,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        status: row.status as FriendGoing['status'],
      };
    });
  }

  return out;
}
