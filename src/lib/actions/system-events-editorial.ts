'use server';

import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { prettyZodError } from '@/lib/validations/common';
import {
  hasBlockingGate,
  runQualityGates,
  type QualityGate,
} from '@/lib/system-events/quality-gates';

const editorialStatusEnum = z.enum(['draft', 'review', 'scheduled', 'published']);

const composerInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  editorial_pitch: z.string().trim().max(300).default(''),
  source_url: z.string().url().max(500).nullable().optional(),
  partner_name: z.string().trim().max(120).nullable().optional(),
  partner_url: z.string().url().max(500).nullable().optional(),
  category_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(60 * 24 * 7),
  country: z.string().min(2).max(3).nullable().optional(),
  city: z.string().trim().min(1).max(120),
  city_id: z.string().uuid().nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  is_free: z.boolean().default(true),
  price: z.number().min(0).nullable().optional(),
  currency: z.string().min(3).max(3).nullable().optional(),
  photos: z.array(z.string().url()).max(6).default([]),
  editorial_status: editorialStatusEnum.default('draft'),
  title_translations: z.record(z.string(), z.string().max(120)).optional().default({}),
  description_translations: z.record(z.string(), z.string().max(4000)).optional().default({}),
});

export type ComposerInput = z.infer<typeof composerInputSchema>;

async function requireSiteStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return { error: 'Insufficient permissions' as const };
  }

  return { user, supabase };
}

/**
 * Fetches OpenGraph metadata from a public URL so the composer can pre-fill
 * a draft from a partner's announcement page. Returns a minimal subset
 * (title, description, image) — anything richer is best entered manually.
 *
 * Errors fail soft: the composer falls back to a blank draft.
 */
export async function fetchOpenGraphFromUrl(url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
  error?: string;
}> {
  // Cheap URL guard so we don't fan out to localhost/private IPs from a server.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'invalid_url' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { error: 'invalid_protocol' };
  }
  if (
    /^(localhost|127\.|10\.|192\.168\.|::1)/.test(parsed.hostname) ||
    parsed.hostname.endsWith('.local')
  ) {
    return { error: 'private_address' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { 'user-agent': 'LocalisioBot/1.0 (+editorial fetch)' },
    });
    clearTimeout(timeout);

    if (!res.ok) return { error: 'fetch_failed' };

    const text = await res.text();
    const meta = extractOpenGraphFromHtml(text);
    return meta;
  } catch {
    return { error: 'fetch_failed' };
  }
}

function extractOpenGraphFromHtml(html: string) {
  // Trimmed regex parser — handles the common shapes (og:title, og:description,
  // og:image, twitter:card, plain <title>). We avoid pulling in a full HTML
  // parser to keep the bundle minimal and the failure mode predictable.
  const get = (name: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const m = html.match(re);
    return m?.[1]?.trim() || undefined;
  };
  const title =
    get('og:title') ||
    get('twitter:title') ||
    (() => {
      const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return m?.[1]?.trim() || undefined;
    })();
  const description = get('og:description') || get('twitter:description') || get('description');
  const image = get('og:image') || get('twitter:image');
  return { title, description, image };
}

/**
 * Returns counts for each editorial pipeline state, partitioned per city.
 * Used by the dashboard. Only includes published `is_system` events.
 */
export async function getEditorialPipeline() {
  const auth = await requireSiteStaff();
  if ('error' in auth) return { error: auth.error };

  const { supabase } = auth;
  const { data, error } = await supabase
    .from('events')
    .select('id, city, editorial_status, status, starts_at')
    .eq('is_system', true);
  if (error) return { error: error.message };

  const targetsRes = await supabase
    .from('system_event_targets')
    .select('city, monthly_target, is_active');

  // Group on the server so the page is a thin presenter.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const byCity = new Map<
    string,
    { draft: number; review: number; scheduled: number; published: number; thisMonth: number }
  >();
  for (const row of data ?? []) {
    const key = row.city || '—';
    if (!byCity.has(key)) {
      byCity.set(key, { draft: 0, review: 0, scheduled: 0, published: 0, thisMonth: 0 });
    }
    const entry = byCity.get(key)!;
    const editorialStatus = (row.editorial_status as string | null) || 'draft';
    if (editorialStatus === 'draft') entry.draft += 1;
    else if (editorialStatus === 'review') entry.review += 1;
    else if (editorialStatus === 'scheduled') entry.scheduled += 1;
    else if (editorialStatus === 'published') entry.published += 1;

    if (row.status === 'published' && new Date(row.starts_at).getTime() >= monthStartMs) {
      entry.thisMonth += 1;
    }
  }

  return {
    byCity: Object.fromEntries(byCity.entries()),
    targets: targetsRes.data ?? [],
  };
}

/**
 * Lists pipeline drafts/reviews for the dashboard. Defaults to the first 25
 * non-published rows, newest first.
 */
export async function getSystemEventDrafts() {
  const auth = await requireSiteStaff();
  if ('error' in auth) return { error: auth.error, rows: [] };

  const { supabase } = auth;
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('is_system', true)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(50);
  return { rows: data || [] };
}

/**
 * Drafts/edits a system event. Always writes to the `events` table with
 * `is_system = true` and validates with the composer schema. Skips quality
 * gates for the MVP — gates are only enforced when transitioning into
 * `scheduled` / `published`.
 */
export async function saveSystemEventDraft(
  input: ComposerInput & { id?: string },
): Promise<{ error?: string; eventId?: string }> {
  const auth = await requireSiteStaff();
  if ('error' in auth) return { error: auth.error };

  const parsed = composerInputSchema.safeParse(input);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };
  const { supabase, user } = auth;
  const data = parsed.data;

  const payload = {
    title: data.title,
    description: data.description,
    editorial_pitch: data.editorial_pitch,
    source_url: data.source_url ?? null,
    partner_name: data.partner_name ?? null,
    partner_url: data.partner_url ?? null,
    category_id: data.category_id,
    starts_at: data.starts_at,
    duration_minutes: data.duration_minutes,
    country: data.country ?? null,
    city: data.city,
    city_id: data.city_id ?? null,
    address: data.address ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    is_free: data.is_free,
    price: data.is_free ? null : data.price ?? null,
    currency: data.is_free ? null : data.currency ?? null,
    photos: data.photos,
    editorial_status: data.editorial_status,
    title_translations: data.title_translations ?? {},
    description_translations: data.description_translations ?? {},
    is_system: true,
    is_online: false,
    is_private: false,
    organizer_id: user.id,
    // While in the editorial pipeline we keep the events.status as 'draft'
    // until publish so the public listing never sees an unfinished row.
    status: data.editorial_status === 'published' ? 'published' : 'draft',
  } as const;

  if (input.id) {
    const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', input.id)
      .eq('is_system', true);
    if (error) return { error: error.message };
    return { eventId: input.id };
  }

  const { data: row, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { eventId: row.id };
}

/**
 * Promotes an existing system event row to `published`. Verifies quality
 * gates server-side so a stale client cannot bypass the rules.
 */
export async function publishSystemEvent(eventId: string) {
  const auth = await requireSiteStaff();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, title, description, editorial_pitch, starts_at, photos, city, category_id, partner_name, is_system',
    )
    .eq('id', eventId)
    .single();
  if (!event || !event.is_system) return { error: 'not_a_system_event' };

  const gates = runQualityGates({
    title: event.title,
    description: event.description,
    editorial_pitch: event.editorial_pitch,
    starts_at: event.starts_at,
    cover_url: (event.photos ?? [])[0] ?? null,
    city: event.city,
    category_id: event.category_id,
    partner_name: event.partner_name,
  });

  if (hasBlockingGate(gates)) {
    return { error: 'quality_gates_failed', gates };
  }

  const { error } = await supabase
    .from('events')
    .update({
      status: 'published',
      editorial_status: 'published',
    })
    .eq('id', eventId)
    .eq('is_system', true);
  if (error) return { error: error.message };
  return { success: true, gates };
}

/**
 * Re-schedules a system event. Used by the editorial calendar's drag-drop UI
 * (and any "edit time" form). Triggers postpone notifications via the
 * shared updateEvent flow if needed; for MVP we just write directly.
 */
export async function rescheduleSystemEvent(eventId: string, newStartsAt: string) {
  const auth = await requireSiteStaff();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;

  const parsed = z.string().datetime().safeParse(newStartsAt);
  if (!parsed.success) return { error: 'invalid_date' };

  const { error } = await supabase
    .from('events')
    .update({ starts_at: parsed.data })
    .eq('id', eventId)
    .eq('is_system', true);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Computes quality gates for a draft input. Used by the composer preview;
 * accepts the same shape that the editor types into the form so it can
 * fire on every keystroke without round-tripping the database.
 */
export async function computeQualityGates(
  input: Partial<ComposerInput>,
): Promise<QualityGate[]> {
  return runQualityGates({
    title: input.title ?? null,
    description: input.description ?? null,
    editorial_pitch: input.editorial_pitch ?? null,
    starts_at: input.starts_at ?? null,
    cover_url: (input.photos ?? [])[0] ?? null,
    city: input.city ?? null,
    category_id: input.category_id ?? null,
    partner_name: input.partner_name ?? null,
  });
}
