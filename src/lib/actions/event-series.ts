'use server';

import { createClient } from '@/lib/supabase/server';
import {
  expandRecurrence,
  type RecurrenceFrequency,
} from '@/lib/recurrence/expand';
import { updateTag } from 'next/cache';

/**
 * Edit-scope marker for series-aware updates.
 *
 *   * `this`   — only the occurrence the user opened;
 *   * `future` — this and every later occurrence;
 *   * `all`    — every occurrence in the series.
 *
 * "Past + this" is intentionally absent: editing a meet-up that
 * already happened is rare and almost always wrong (RSVPs and
 * reviews are bound to the original date), so we make the user
 * pick a per-occurrence override instead.
 */
export type SeriesEditScope = 'this' | 'future' | 'all';

interface CreateSeriesFromEventInput {
  /** UUID of an existing event row that becomes occurrence #1. */
  eventId: string;
  frequency: RecurrenceFrequency;
  count: number;
}

/**
 * Promotes a single event into a series of `count` occurrences.
 *
 * We:
 *   1. Insert a parent row in `event_series`.
 *   2. Patch the existing event with `series_id` + `series_position = 1`.
 *   3. Clone the event for occurrences 2..count, advancing only
 *      `starts_at` (and `ends_at` when present) — every other
 *      column inherits from occurrence #1, including capacity and
 *      languages.
 *
 * Cloning is intentionally column-by-column (not `INSERT ...
 * SELECT *`) because:
 *   * we must drop ID and timestamps so Supabase generates fresh
 *     ones;
 *   * we want to *not* copy the private_token (each occurrence
 *     gets its own).
 *
 * Returns `{ seriesId, occurrenceIds }` on success.
 */
export async function createSeriesFromEvent(
  input: CreateSeriesFromEventInput,
): Promise<
  | { seriesId: string; occurrenceIds: string[] }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: source, error: fetchErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', input.eventId)
    .single();
  if (fetchErr || !source) return { error: fetchErr?.message || 'Event not found' };
  if (source.organizer_id !== user.id) {
    return { error: 'Only the organiser can convert this event into a series.' };
  }
  if (source.series_id) {
    return { error: 'Event already belongs to a series.' };
  }

  const cap = Math.min(Math.max(input.count, 2), 52);
  const occurrences = expandRecurrence({
    frequency: input.frequency,
    count: cap,
    startsAt: source.starts_at,
  });
  if (occurrences.length < 2) {
    return { error: 'A series needs at least two occurrences.' };
  }

  // 1. Parent row.
  const { data: series, error: seriesErr } = await supabase
    .from('event_series')
    .insert({
      organizer_id: user.id,
      frequency: input.frequency,
      count: cap,
    })
    .select('id')
    .single();
  if (seriesErr || !series) return { error: seriesErr?.message || 'Failed to create series' };

  // 2. Patch the seed event.
  const { error: patchErr } = await supabase
    .from('events')
    .update({ series_id: series.id, series_position: 1 })
    .eq('id', source.id);
  if (patchErr) return { error: patchErr.message };

  // 3. Clone the remainder. We strip ID, timestamps, and
  // `private_token` so Postgres / our defaults generate them.
  const occurrenceIds: string[] = [source.id];
  for (let i = 1; i < occurrences.length; i += 1) {
    const clone = {
      ...source,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      private_token: null,
      series_id: series.id,
      series_position: i + 1,
      starts_at: occurrences[i],
    } as Record<string, unknown>;
    delete clone.id;
    delete clone.created_at;
    delete clone.updated_at;
    delete clone.search_tsv; // generated column
    delete clone.ends_at; // generated from starts_at + duration

    const { data: inserted, error: insertErr } = await supabase
      .from('events')
      .insert(clone)
      .select('id')
      .single();
    if (insertErr || !inserted) {
      return { error: insertErr?.message || 'Failed to clone occurrence' };
    }
    occurrenceIds.push(inserted.id);
  }

  updateTag('events');
  return { seriesId: series.id, occurrenceIds };
}

/**
 * Apply a partial event update across the requested scope.
 *
 *   * `scope = this`   — UPDATE one row by id; no series logic.
 *   * `scope = future` — UPDATE every event in the same series with
 *                        `starts_at >= the seed event's starts_at`.
 *   * `scope = all`    — UPDATE every event in the same series.
 *
 * Time-shifting fields (`starts_at`, `duration_minutes`) need a
 * little care: shifting a single occurrence is fine, but
 * "future"/"all" shifts on `starts_at` would collapse every
 * occurrence to the same instant, which is almost never what the
 * user wants. We therefore *reject* `starts_at` patches when scope
 * is not `this` and let the caller use a higher-level "reschedule
 * series" flow if they truly want it.
 */
export async function updateEventScoped(opts: {
  eventId: string;
  scope: SeriesEditScope;
  patch: Record<string, unknown>;
}): Promise<{ updated: number; error?: string }> {
  const { eventId, scope, patch } = opts;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { updated: 0, error: 'Not authenticated' };

  if (scope !== 'this' && 'starts_at' in patch) {
    return {
      updated: 0,
      error: 'Use scope="this" to reschedule a single occurrence.',
    };
  }

  if (scope === 'this') {
    const { error, count } = await supabase
      .from('events')
      .update(patch, { count: 'exact' })
      .eq('id', eventId);
    if (error) return { updated: 0, error: error.message };
    return { updated: count || 0 };
  }

  // Series-scoped paths.
  const { data: seed, error: fetchErr } = await supabase
    .from('events')
    .select('series_id, starts_at')
    .eq('id', eventId)
    .single();
  if (fetchErr || !seed?.series_id) {
    return { updated: 0, error: 'Event is not part of a series.' };
  }

  let query = supabase
    .from('events')
    .update(patch, { count: 'exact' })
    .eq('series_id', seed.series_id);

  if (scope === 'future') {
    query = query.gte('starts_at', seed.starts_at);
  }

  const { error, count } = await query;
  if (error) return { updated: 0, error: error.message };

  updateTag('events');
  return { updated: count || 0 };
}
