'use server';

import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from '@/lib/utils';
import { prettyZodError } from '@/lib/validations/common';

/**
 * "Идём вместе" creation flow — a meetup is a community event that points
 * back at a parent system event via `parent_system_event_id`. We keep the
 * payload tight on purpose: the parent already encodes when/where, and the
 * inviter only customises the social bits (title, description, group of
 * cap-conscious settings, optional alternative meeting point).
 */
const createMeetupSchema = z.object({
  parent_system_event_id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(''),
  max_attendees: z.number().int().min(2).max(500).nullable().optional(),
  meeting_point: z.string().trim().max(300).nullable().optional(),
  is_private: z.boolean().default(false),
  group_id: z.string().uuid().nullable().optional(),
});

export type CreateMeetupInput = z.infer<typeof createMeetupSchema>;

/**
 * Creates a community event linked to a parent system event. Most fields are
 * inherited from the parent so the user does not need to re-enter them and the
 * meetup stays in lockstep with the listing (date/time, city, online flag,
 * cover photo, language hints).
 *
 * Returns the freshly inserted event row on success or a friendly error
 * message ready for `toast.error`.
 */
export async function createMeetupForSystemEvent(input: CreateMeetupInput) {
  const parsed = createMeetupSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: parent, error: parentError } = await supabase
    .from('events')
    .select(
      [
        'id',
        'is_system',
        'is_blocked',
        'category_id',
        'starts_at',
        'duration_minutes',
        'languages',
        'country',
        'city',
        'city_id',
        'address',
        'lat',
        'lng',
        'is_online',
        'photos',
        'title',
      ].join(', '),
    )
    .eq('id', parsed.data.parent_system_event_id)
    .single();

  if (parentError || !parent) return { error: 'parent_event_not_found' };
  // Cast: the select() return type is generic and we know each column above.
  const p = parent as unknown as {
    id: string;
    is_system: boolean | null;
    is_blocked: boolean | null;
    category_id: string;
    starts_at: string;
    duration_minutes: number;
    languages: string[] | null;
    country: string | null;
    city: string | null;
    city_id: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    is_online: boolean | null;
    photos: string[] | null;
    title: string;
  };
  if (!p.is_system) return { error: 'parent_not_system' };
  if (p.is_blocked) return { error: 'parent_blocked' };

  const insertPayload = {
    title: parsed.data.title,
    description: parsed.data.description,
    organizer_id: user.id,
    parent_system_event_id: p.id,
    is_system: false,
    status: 'published' as const,
    // Inherit time + place from the parent — the meetup must align so that
    // the calendar item the user already saved makes sense.
    category_id: p.category_id,
    starts_at: p.starts_at,
    duration_minutes: p.duration_minutes,
    languages: p.languages ?? [],
    country: p.country,
    city: p.city,
    city_id: p.city_id,
    // Optional override for "let's meet at the entrance" — falls back to
    // the parent's address if empty.
    address: parsed.data.meeting_point ?? p.address,
    lat: p.lat,
    lng: p.lng,
    is_online: p.is_online ?? false,
    photos: p.photos?.slice(0, 1) ?? [],
    is_private: parsed.data.is_private,
    private_token: parsed.data.is_private ? nanoid(24) : null,
    group_id: parsed.data.group_id ?? null,
    is_free: true,
    max_attendees: parsed.data.max_attendees ?? null,
  };

  const { data: meetup, error } = await supabase
    .from('events')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, event: meetup };
}

/**
 * Lists published meetups attached to a given system event, ordered by
 * meetup popularity (going_count desc) so the loudest groups bubble to the
 * top of the "Идём вместе" panel. Returns up to 12 entries.
 */
export async function getMeetupsForSystemEvent(systemEventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('parent_system_event_id', systemEventId)
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('going_count', { ascending: false })
    .order('starts_at', { ascending: true })
    .limit(12);

  if (error) return [];
  return data || [];
}

/**
 * Convenience for the SystemEventActions CTA — returns just the count so the
 * meetup pill on the action button can render without fetching the full list.
 */
export async function getMeetupCountForSystemEvent(
  systemEventId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('parent_system_event_id', systemEventId)
    .eq('status', 'published')
    .eq('is_blocked', false);
  return count ?? 0;
}
