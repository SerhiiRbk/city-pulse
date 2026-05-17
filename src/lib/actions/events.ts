'use server';

import { updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from '@/lib/utils';
import { canViewBlockedOwnedResource, getViewerContext } from '@/lib/server/viewer-context';
import { createNotification } from '@/lib/actions/notifications';
import {
  createEventSchema,
  eventCommentSchema,
  updateEventSchema,
  type CreateEventInput,
  type EventCommentInput,
  type UpdateEventInput,
} from '@/lib/validations/events';
import { prettyZodError } from '@/lib/validations/common';
import {
  parseAndValidateRichTextDoc,
  RichTextValidationError,
} from '@/lib/rich-text/validate';
import { extractPlainText } from '@/lib/rich-text/extract-plain';
import type { Json } from '@/types/database';

const MAX_DESCRIPTION_PLAIN_LENGTH = 4000;

/**
 * Normalises the optional rich-text description payload coming
 * from event/group create/update actions.
 *
 * Inputs:
 *   * `undefined` — caller didn't touch the description; leave both
 *     `description` and `description_json` untouched on the row;
 *   * `null` — caller explicitly wants to clear the rich body;
 *   * any other value — must round-trip through
 *     `parseAndValidateRichTextDoc` (server-side whitelist). On
 *     success we return both the validated JSON doc and a clamped
 *     plain-text projection so the trigger has a defensible mirror
 *     to write into `description`.
 */
function normalizeDescriptionRichText(
  raw: unknown,
): { kind: 'untouched' } | { kind: 'cleared' } | { kind: 'set'; doc: Json; plain: string } | { error: string } {
  if (raw === undefined) return { kind: 'untouched' };
  if (raw === null) return { kind: 'cleared' };
  try {
    const doc = parseAndValidateRichTextDoc(raw);
    const plain = extractPlainText(doc).slice(0, MAX_DESCRIPTION_PLAIN_LENGTH);
    return { kind: 'set', doc: doc as unknown as Json, plain };
  } catch (err) {
    if (err instanceof RichTextValidationError) return { error: err.message };
    return { error: 'Invalid description body' };
  }
}

function revalidateLandingEvents() {
  updateTag('landing:events');
  updateTag('events:map');
}

export async function createEvent(input: CreateEventInput) {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const richBody = normalizeDescriptionRichText(parsed.data.description_json);
  if ('error' in richBody) return richBody;

  // The plain `description` from the form is a best-effort fallback
  // (used when the client never sends `description_json`, e.g. third
  // party callers). When the rich doc is set we override it with the
  // server-derived plain text so the row matches what the trigger
  // would have written anyway, and so old clients reading
  // `description` see exactly the same string the editor produced.
  const { description_json: _ignoredJson, ...rest } = parsed.data;
  const eventData: Record<string, unknown> = {
    ...rest,
    organizer_id: user.id,
    private_token: parsed.data.is_private ? nanoid(24) : null,
    status: 'published' as const,
  };
  if (richBody.kind === 'set') {
    eventData.description = richBody.plain;
    eventData.description_json = richBody.doc;
  } else if (richBody.kind === 'cleared') {
    eventData.description_json = null;
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidateLandingEvents();
  return { success: true, event };
}

export async function canEditEvent(eventId: string) {
  const supabase = await createClient();
  const viewer = await getViewerContext();
  if (!viewer.userId) return false;

  if (viewer.isAdmin) return true;

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, is_blocked')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return false;
  if (event.organizer_id === viewer.userId) return true;
  if (event.is_blocked) return false;
  if (viewer.isModerator) return true;

  const { data: mod } = await supabase
    .from('event_moderators')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', viewer.userId)
    .single();

  return !!mod;
}

export async function updateEvent(eventId: string, data: UpdateEventInput) {
  const parsed = updateEventSchema.safeParse(data);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission to edit this event' };

  // Capture pre-update state so we can detect a postpone and notify
  // attendees once after the write succeeds. We also need is_system here
  // so a system-event reschedule can fan out to linked meetup organizers.
  const { data: before } = await supabase
    .from('events')
    .select('starts_at, title, status, is_system')
    .eq('id', eventId)
    .single();

  // Reconcile the optional rich-text body. We only forward the
  // sub-set of {description, description_json} that the caller
  // actually intended to change so partial updates (e.g. moderators
  // toggling status) don't accidentally clear out the rich content.
  const richBody = normalizeDescriptionRichText(parsed.data.description_json);
  if ('error' in richBody) return richBody;

  const { description_json: _ignoredJson, ...rest } = parsed.data;
  const updatePayload: Record<string, unknown> = { ...rest };
  if (richBody.kind === 'set') {
    updatePayload.description = richBody.plain;
    updatePayload.description_json = richBody.doc;
  } else if (richBody.kind === 'cleared') {
    updatePayload.description_json = null;
    // We deliberately don't touch `description` here: clearing the
    // rich doc resets the column to "freeform plain text" mode and
    // the existing plain string (if any) stays as the canonical
    // value until the caller rewrites it.
  }

  const { error } = await supabase.from('events').update(updatePayload).eq('id', eventId);
  if (error) return { error: error.message };
  revalidateLandingEvents();

  // Best-effort notify attendees if the start time moved while the
  // event is still published. Postpone-or-bring-forward both qualify.
  try {
    const newStart = parsed.data.starts_at;
    if (
      before &&
      before.status === 'published' &&
      typeof newStart === 'string' &&
      newStart !== before.starts_at
    ) {
      const movedForward = new Date(newStart).getTime() > new Date(before.starts_at).getTime();
      const { data: stakeholders } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', eventId)
        .in('status', ['going', 'waitlist', 'interested']);

      const uniqueUsers = Array.from(
        new Set(
          (stakeholders ?? [])
            .map((row) => row.user_id)
            .filter((id) => id && id !== user.id),
        ),
      );

      if (uniqueUsers.length > 0) {
        const rows = uniqueUsers.map((userId) => ({
          user_id: userId,
          type: 'event_postponed' as const,
          title: `${before.title} — new start time`,
          body: movedForward
            ? 'The organiser moved this event later. Check the new start time in your calendar.'
            : 'The organiser moved this event earlier. Double-check the new start time.',
          data: {
            event_id: eventId,
            previous_starts_at: before.starts_at,
            new_starts_at: newStart,
          },
        }));
        await supabase.from('notifications').insert(rows);
      }

      /*
       * Postpone propagation for system events: meetup organizers anchored
       * to this listing inherited the original starts_at, so a shift here
       * stale-dates their entire plan. We notify them so they can decide
       * whether to mirror the change manually (we do NOT auto-rewrite the
       * meetup row — date changes for a meetup affect already-RSVP'd
       * attendees and need the organizer's explicit consent).
       */
      if (before.is_system) {
        const { data: meetups } = await supabase
          .from('events')
          .select('id, organizer_id, title')
          .eq('parent_system_event_id', eventId)
          .eq('status', 'published');
        if (meetups && meetups.length > 0) {
          const rows = meetups
            .filter((m) => m.organizer_id && m.organizer_id !== user.id)
            .map((m) => ({
              user_id: m.organizer_id as string,
              type: 'event_parent_postponed' as const,
              title: `${before.title} moved`,
              body: `Your meetup "${m.title}" was anchored to this listing. Update or cancel it as needed.`,
              data: {
                event_id: m.id,
                parent_system_event_id: eventId,
                previous_starts_at: before.starts_at,
                new_starts_at: newStart,
              },
            }));
          if (rows.length > 0) {
            await supabase.from('notifications').insert(rows);
          }
        }
      }
    }
  } catch {
    // Best-effort — never fail an edit because of notifications.
  }

  return { success: true };
}

export async function getEventRaw(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  return data;
}

export async function getEvent(eventId: string) {
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([
    supabase
      .from('events_with_counts')
      .select('*')
      .eq('id', eventId)
      .maybeSingle(),
    getViewerContext(),
  ]);

  if (!data) return null;
  if (!canViewBlockedOwnedResource(viewer, data.organizer_id, {
    isBlocked: data.is_blocked,
    ownerBlocked: data.organizer_is_blocked,
  })) {
    return null;
  }

  return data;
}

export type EventSort = 'soon' | 'popular';

export async function getEvents(filters: {
  country?: string;
  city?: string;
  city_id?: string;
  category?: string;
  categories?: string[];
  languages?: string[];
  date_from?: string;
  date_to?: string;
  is_free?: boolean;
  is_online?: boolean;
  /**
   * Tri-state filter on the editorial Афиша flag:
   *   - undefined: include both community and system events (default).
   *   - true: only system (Афиша) events.
   *   - false: only community events (hides Афиша).
   * Surfaced on the /events page as a toggle so people who want to ignore
   * city listings can do so without losing access to community gatherings.
   */
  is_system?: boolean;
  /**
   * Free-text query. Matched against `events.search_tsv` via the
   * Postgres `@@` operator, so it covers title, description, and
   * city. We use the 'simple' tsconfig (multilingual, no stemming)
   * with prefix matching ("foo:*"), so partial words match too.
   */
  q?: string;
  /**
   * Filter to events whose `safety_tags` array contains ALL of the
   * provided values. Used by the "show me only sober / women-only"
   * style chips in the events filter bar.
   */
  safety_tags?: string[];
  limit?: number;
  offset?: number;
  /**
   * When true, do not filter out events that have already started.
   * Default behavior hides past events from public discovery surfaces;
   * organizer/moderator views can opt in to see them.
   */
  include_past?: boolean;
  /**
   * Sort strategy applied after filtering. Default `soon` orders by
   * start time ascending — best for "what's next". `popular` ranks by
   * RSVP count. Reviews-based sorting is intentionally not exposed
   * here: reviews are written after an event ends, so they have no
   * meaningful signal for the upcoming-events listing.
   */
  sort?: EventSort;
}) {
  const supabase = await createClient();
  let query = supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false);

  if (!filters.include_past) {
    // Hide only events that have actually finished, so currently
    // in-progress events stay visible. `ends_at` is exposed by the
    // events_with_counts view as starts_at + duration_minutes.
    query = query.gte('ends_at', new Date().toISOString());
  }

  // When city_id is provided, skip country filter — city already
  // implies the country and some legacy events may have NULL country.
  if (filters.city_id) {
    query = query.eq('city_id', filters.city_id);
  } else if (filters.city) {
    query = query.eq('city', filters.city);
  } else if (filters.country) {
    // Country-only filter (no city specified).
    query = query.eq('country', filters.country);
  }
  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category_id', filters.categories);
  } else if (filters.category) {
    query = query.eq('category_id', filters.category);
  }
  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages);
  }
  if (filters.date_from) {
    // Plain YYYY-MM-DD strings are inflated to start/end of day so the
    // user gets the inclusive window they expect (e.g. `from=2026-05-06`
    // matches an event at 2026-05-06T20:00:00Z).
    const expandedFrom = filters.date_from.length === 10 ? `${filters.date_from}T00:00:00Z` : filters.date_from;
    query = query.gte('starts_at', expandedFrom);
  }
  if (filters.date_to) {
    const expandedTo = filters.date_to.length === 10 ? `${filters.date_to}T23:59:59Z` : filters.date_to;
    query = query.lte('starts_at', expandedTo);
  }
  if (filters.is_free !== undefined) query = query.eq('is_free', filters.is_free);
  if (filters.is_online !== undefined) query = query.eq('is_online', filters.is_online);
  if (filters.is_system !== undefined) query = query.eq('is_system', filters.is_system);
  if (filters.safety_tags && filters.safety_tags.length > 0) {
    // `contains` -> `safety_tags @> ARRAY[...]` so we keep an event
    // only if it advertises EVERY requested tag. The GIN index on
    // safety_tags makes this O(log n).
    query = query.contains('safety_tags', filters.safety_tags);
  }
  if (filters.q && filters.q.trim().length > 0) {
    // We rely on the GIN index on `search_tsv`; supabase-js exposes
    // textSearch with the matching `simple` config. Prefix matching
    // is achieved by the Postgres helper but supabase-js doesn't let
    // us call our function directly, so we lean on its built-in
    // `websearch` type which handles partial words and quoted
    // phrases with reasonable defaults.
    query = query.textSearch('search_tsv', filters.q.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  }

  const sort: EventSort = filters.sort ?? 'soon';
  switch (sort) {
    case 'popular':
      query = query
        .order('going_count', { ascending: false })
        .order('starts_at', { ascending: true });
      break;
    case 'soon':
    default:
      query = query.order('starts_at', { ascending: true });
      break;
  }

  const limit = filters.limit || 12;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export type AttendanceStatus =
  | 'none'
  | 'interested'
  | 'going'
  | 'waitlist'
  | 'attended'
  | 'no_show'
  | 'cancelled';

function normalizeAttendanceStatus(raw: string | null | undefined): AttendanceStatus {
  switch (raw) {
    case 'interested':
    case 'going':
    case 'waitlist':
    case 'attended':
    case 'no_show':
    case 'cancelled':
      return raw;
    default:
      return 'none';
  }
}

export async function toggleAttendance(
  eventId: string,
): Promise<{ error?: string; status?: AttendanceStatus }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: ev } = await supabase
    .from('events')
    .select('is_system')
    .eq('id', eventId)
    .single();

  const { data: existing } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  // Toggle off: if already going (or waitlist for community), remove
  if (existing && (existing.status === 'going' || existing.status === 'waitlist')) {
    await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    return { status: 'none' };
  }

  // For system events: always set 'going', no capacity check
  if (ev?.is_system) {
    const { data: inserted } = await supabase
      .from('event_attendees')
      .upsert({ event_id: eventId, user_id: user.id, status: 'going' })
      .select('status')
      .single();
    return { status: normalizeAttendanceStatus(inserted?.status) };
  }

  // For community events: upsert as 'going'; DB trigger may downgrade to 'waitlist'
  const { data: inserted } = await supabase
    .from('event_attendees')
    .upsert({ event_id: eventId, user_id: user.id, status: 'going' })
    .select('status')
    .single();

  return { status: normalizeAttendanceStatus(inserted?.status) };
}

/**
 * Organizer / moderator-only: mark a user's post-event attendance outcome.
 * RLS ensures non-privileged callers cannot set 'attended' / 'no_show'.
 */
export async function markAttendance(
  eventId: string,
  userId: string,
  outcome: 'attended' | 'no_show' | 'going',
): Promise<{ error?: string; status?: AttendanceStatus }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_attendees')
    .update({ status: outcome })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('status')
    .single();

  if (error) return { error: error.message };
  return { status: normalizeAttendanceStatus(data?.status) };
}

export async function toggleFavorite(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('event_favorites')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase
      .from('event_favorites')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    return { favorited: false };
  }

  await supabase
    .from('event_favorites')
    .insert({ event_id: eventId, user_id: user.id });
  return { favorited: true };
}

export async function getUserAttendance(eventId: string): Promise<{
  status: AttendanceStatus;
  going: boolean;
  favorited: boolean;
  isVisible: boolean;
  /**
   * True iff the cron has prompted this user for re-confirmation
   * and they have not yet confirmed. Drives the banner CTA on the
   * event detail page.
   */
  needsReconfirm: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'none', going: false, favorited: false, isVisible: true, needsReconfirm: false };
  }

  const [{ data: attendance }, { data: favorite }] = await Promise.all([
    supabase
      .from('event_attendees')
      .select('status, is_visible, reconfirm_sent_at, confirmed')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('event_favorites')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single(),
  ]);

  const status = normalizeAttendanceStatus(attendance?.status);

  return {
    status,
    going: status === 'going',
    favorited: !!favorite,
    isVisible: attendance?.is_visible ?? true,
    needsReconfirm:
      status === 'going' &&
      !!attendance?.reconfirm_sent_at &&
      !attendance?.confirmed,
  };
}

/**
 * Re-confirm the current user's `going` RSVP.
 *
 * The 24h cron pings users with a `rsvp_reconfirm_24h` notification.
 * Tapping the inline CTA on the event detail page calls this action,
 * which flips `confirmed = true, confirmed_at = now()`. Confirmed
 * rows are immune to the auto-release pass; everyone else has their
 * RSVP cancelled so the waitlist can promote.
 */
export async function reconfirmAttendance(
  eventId: string,
): Promise<{ error?: string; confirmed?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('event_attendees')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'going')
    .select('confirmed')
    .single();

  if (error) return { error: error.message };
  return { confirmed: !!data?.confirmed };
}

/**
 * Toggle whether the current user's RSVP is shown in the public roster.
 * Hidden RSVPs still consume capacity (they remain in the counts), so
 * this is purely a display-level privacy switch — useful for sensitive
 * events (mental health, dating, women-only spaces) where attendance
 * itself can be private.
 */
export async function setRsvpVisibility(
  eventId: string,
  isVisible: boolean,
): Promise<{ error?: string; isVisible?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('event_attendees')
    .update({ is_visible: isVisible })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .select('is_visible')
    .single();

  if (error) return { error: error.message };
  return { isVisible: data?.is_visible ?? isVisible };
}

export async function getUserEventStatuses(eventIds: string[]): Promise<{
  goingSet: Set<string>;
  waitlistSet: Set<string>;
  interestedSet: Set<string>;
  favoritedSet: Set<string>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || eventIds.length === 0) {
    return {
      goingSet: new Set(),
      waitlistSet: new Set(),
      interestedSet: new Set(),
      favoritedSet: new Set(),
    };
  }

  const [{ data: attendances }, { data: favorites }] = await Promise.all([
    supabase
      .from('event_attendees')
      .select('event_id, status')
      .eq('user_id', user.id)
      .in('status', ['going', 'waitlist', 'interested'])
      .in('event_id', eventIds),
    supabase
      .from('event_favorites')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds),
  ]);

  const goingSet = new Set<string>();
  const waitlistSet = new Set<string>();
  const interestedSet = new Set<string>();
  for (const row of attendances || []) {
    if (row.status === 'going') goingSet.add(row.event_id);
    else if (row.status === 'waitlist') waitlistSet.add(row.event_id);
    else if (row.status === 'interested') interestedSet.add(row.event_id);
  }

  return {
    goingSet,
    waitlistSet,
    interestedSet,
    favoritedSet: new Set((favorites || []).map((f) => f.event_id)),
  };
}

export async function getEventAttendees(eventId: string) {
  const supabase = await createClient();
  // Public roster: hide rows that opted into private RSVP.
  // Counts elsewhere (going_count etc.) still reflect those rows;
  // only the avatar/name list is filtered.
  const { data } = await supabase
    .from('event_attendees')
    .select('user_id, status, profiles(display_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'going')
    .eq('is_visible', true);
  return data || [];
}

/**
 * Bulk-fetch a few visible attendee avatars per event for card display.
 * Returns up to 3 avatars per event to show social proof on listing cards.
 */
export async function getAttendeeAvatarsBulk(
  eventIds: string[],
): Promise<Record<string, { avatar_url: string | null; display_name: string }[]>> {
  if (eventIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_attendees')
    .select('event_id, profiles(display_name, avatar_url)')
    .in('event_id', eventIds)
    .eq('status', 'going')
    .eq('is_visible', true)
    .limit(eventIds.length * 3);

  if (error || !data) return {};

  const result: Record<string, { avatar_url: string | null; display_name: string }[]> = {};
  for (const row of data) {
    const profile = row.profiles as { display_name: string; avatar_url: string | null } | null;
    if (!profile) continue;
    if (!result[row.event_id]) result[row.event_id] = [];
    if (result[row.event_id].length < 3) {
      result[row.event_id].push({
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
      });
    }
  }
  return result;
}

/**
 * Organizer-facing roster: includes every active/past participant row
 * (going, waitlist, attended, no_show, cancelled). Used for post-event
 * attendance marking.
 */
export async function getEventRoster(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_attendees')
    .select('user_id, status, created_at, profiles(display_name, avatar_url)')
    .eq('event_id', eventId)
    .in('status', ['going', 'waitlist', 'attended', 'no_show'])
    .order('created_at', { ascending: true });
  return data || [];
}

/**
 * Returns the count of published events organized by a user.
 * Used to show "verified organizer" badge on event detail pages.
 */
export async function getOrganizerEventCount(organizerId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organizer_id', organizerId)
    .eq('status', 'published');
  return count ?? 0;
}

export async function addComment(
  eventId: string,
  content: string,
  parentId?: string,
  options?: { quotedText?: string; quotedAuthorName?: string; replyToId?: string },
) {
  const parsed = eventCommentSchema.safeParse({
    content,
    parentId,
    replyToId: options?.replyToId,
    quotedText: options?.quotedText,
    quotedAuthorName: options?.quotedAuthorName,
  } satisfies EventCommentInput);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, title')
    .eq('id', eventId)
    .single();

  const isReply = !!parentId;
  let autoApprove = true;

  if (isReply) {
    const isOrganizer = event?.organizer_id === user.id;

    const { data: mod } = await supabase
      .from('event_moderators')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSiteStaff = profile?.role === 'admin' || profile?.role === 'moderator';
    autoApprove = isOrganizer || !!mod || isSiteStaff;
  }

  const { data, error } = await supabase
    .from('event_comments')
    .insert({
      event_id: eventId,
      user_id: user.id,
      content: parsed.data.content,
      parent_id: parsed.data.parentId || null,
      is_approved: autoApprove,
      quoted_text: parsed.data.quotedText || null,
      quoted_author_name: parsed.data.quotedAuthorName || null,
      reply_to_id: parsed.data.replyToId || null,
    })
    .select('*, profiles(display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };

  const commenterName = data.profiles?.display_name || 'Someone';
  const snippet =
    parsed.data.content.length > 80 ? parsed.data.content.slice(0, 77) + '...' : parsed.data.content;
  const alreadyNotified = new Set<string>([user.id]);

  if (isReply && parentId) {
    const { data: parentComment } = await supabase
      .from('event_comments')
      .select('user_id')
      .eq('id', parentId)
      .single();

    if (parentComment && !alreadyNotified.has(parentComment.user_id)) {
      alreadyNotified.add(parentComment.user_id);
      void createNotification({
        userId: parentComment.user_id,
        type: 'comment_reply',
        title: `${commenterName} replied to your comment`,
        body: snippet,
        data: { eventId },
      });
    }

    if (options?.replyToId && options.replyToId !== parentId) {
      const { data: replyToComment } = await supabase
        .from('event_comments')
        .select('user_id')
        .eq('id', options.replyToId)
        .single();

      if (replyToComment && !alreadyNotified.has(replyToComment.user_id)) {
        alreadyNotified.add(replyToComment.user_id);
        void createNotification({
          userId: replyToComment.user_id,
          type: 'comment_reply',
          title: `${commenterName} replied to your comment`,
          body: snippet,
          data: { eventId },
        });
      }
    }
  }

  if (event?.organizer_id && !alreadyNotified.has(event.organizer_id)) {
    alreadyNotified.add(event.organizer_id);
    void createNotification({
      userId: event.organizer_id,
      type: 'new_comment',
      title: `${commenterName} commented on "${event.title}"`,
      body: snippet,
      data: { eventId },
    });
  }

  const { data: mods } = await supabase
    .from('event_moderators')
    .select('user_id')
    .eq('event_id', eventId);

  for (const mod of mods || []) {
    if (!alreadyNotified.has(mod.user_id)) {
      alreadyNotified.add(mod.user_id);
      void createNotification({
        userId: mod.user_id,
        type: 'new_comment',
        title: `${commenterName} commented on "${event?.title || 'event'}"`,
        body: snippet,
        data: { eventId },
      });
    }
  }

  return { comment: data };
}

export async function getComments(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_comments')
    .select('*, profiles(display_name, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function approveComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('event_comments')
    .update({ is_approved: true })
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getEventModerators(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_moderators')
    .select('user_id, created_at, profiles:user_id(id, display_name, avatar_url)')
    .eq('event_id', eventId);
  return data || [];
}

export async function addEventModerator(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('event_moderators')
    .insert({ event_id: eventId, user_id: userId });

  if (error) {
    if (error.code === '23505') return { error: 'Already a moderator' };
    return { error: error.message };
  }
  return { success: true };
}

export async function removeEventModerator(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('event_moderators')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadEventPhoto(formData: FormData, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('photo') as File;
  if (!file) return { error: 'No file' };

  const fileExt = file.name.split('.').pop();
  const filePath = `${eventId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('event-photos')
    .upload(filePath, file);

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from('event-photos').getPublicUrl(filePath);

  return { url: publicUrl };
}
