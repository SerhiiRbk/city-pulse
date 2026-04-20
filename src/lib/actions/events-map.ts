import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

export type EventsMapMarker = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  starts_at: string;
  duration_minutes: number;
  is_free: boolean;
  price: number | null;
  currency: string | null;
  address: string | null;
  city: string | null;
  photos: string[] | null;
  category_id: string | null;
  category_slug: string | null;
  category_translations: Record<string, string> | null;
  going_count: number;
  max_attendees: number | null;
  organizer_id: string;
  organizer_name: string | null;
};

export type GetEventsInBboxParams = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  from: string; // ISO timestamp
  to: string; // ISO timestamp
  categoryIds?: string[];
  isFreeOnly?: boolean;
  limit?: number;
};

const BBOX_BUCKET_DEG = 0.02; // ~2 km — rounds viewport to a grid for cache reuse
const TIME_BUCKET_MS = 60 * 60 * 1000; // 1 hour — groups queries into hourly buckets
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

// Always snap outward: floor for min bounds, ceil for max bounds. If we used
// Math.round for both, a viewport smaller than BBOX_BUCKET_DEG (~2 km, i.e.
// zoom 14+) would round both edges to the same grid point and the resulting
// bbox would exclude every event inside — markers disappear on deep zoom.
function bucketFloor(value: number): number {
  return Math.floor(value / BBOX_BUCKET_DEG) * BBOX_BUCKET_DEG;
}

function bucketCeil(value: number): number {
  return Math.ceil(value / BBOX_BUCKET_DEG) * BBOX_BUCKET_DEG;
}

function bucketTimeFloor(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(Math.floor(t / TIME_BUCKET_MS) * TIME_BUCKET_MS).toISOString();
}

function bucketTimeCeil(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  // ceil so the upper bound covers the real request — floor would shave up
  // to 59 minutes off and drop events that start late in the range.
  return new Date(Math.ceil(t / TIME_BUCKET_MS) * TIME_BUCKET_MS).toISOString();
}

/**
 * Cached bbox query for the events map. Results are shared across users
 * because the underlying Supabase client uses the anonymous role.
 *
 * Cache keys are stabilised by rounding bbox to a 2 km grid and time to
 * hourly buckets, which produces predictable hit rates while panning
 * and zooming the map.
 *
 * Invalidate via `updateTag('events:map')` (coarse) from event mutation
 * actions; we do not currently do per-bbox invalidation because it would
 * require tracking which bbox tags a given event touches.
 */
export async function getEventsInBbox(
  params: GetEventsInBboxParams,
): Promise<EventsMapMarker[]> {
  'use cache';

  const minLat = bucketFloor(params.minLat);
  const maxLat = bucketCeil(params.maxLat);
  const minLng = bucketFloor(params.minLng);
  const maxLng = bucketCeil(params.maxLng);
  const fromBucket = bucketTimeFloor(params.from);
  const toBucket = bucketTimeCeil(params.to);

  const bboxKey = `${minLat}:${maxLat}:${minLng}:${maxLng}`;
  cacheTag('events:map', `events:map:${bboxKey}:${fromBucket.slice(0, 13)}`);
  cacheLife({ stale: 60, revalidate: 120, expire: 900 });

  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const supabase = createPublicClient();
  let query = supabase
    .from('events_with_counts')
    .select(
      [
        'id',
        'title',
        'lat',
        'lng',
        'starts_at',
        'duration_minutes',
        'is_free',
        'price',
        'currency',
        'address',
        'city',
        'photos',
        'category_id',
        'category_slug',
        'category_translations',
        'going_count',
        'max_attendees',
        'organizer_id',
        'organizer_name',
      ].join(','),
    )
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .eq('is_online', false)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', minLat)
    .lte('lat', maxLat)
    .gte('lng', minLng)
    .lte('lng', maxLng)
    .gte('starts_at', fromBucket)
    .lte('starts_at', toBucket)
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (params.categoryIds && params.categoryIds.length > 0) {
    query = query.in('category_id', params.categoryIds);
  }
  if (params.isFreeOnly) {
    query = query.eq('is_free', true);
  }

  const { data, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[events-map] getEventsInBbox failed', error);
    return [];
  }
  return (data ?? []) as unknown as EventsMapMarker[];
}
