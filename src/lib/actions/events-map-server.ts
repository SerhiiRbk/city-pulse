'use server';

import { z } from 'zod';
import {
  getEventsInBbox,
  type EventsMapMarker,
  type GetEventsInBboxParams,
} from './events-map';

const paramsSchema = z.object({
  minLat: z.number().min(-90).max(90),
  maxLat: z.number().min(-90).max(90),
  minLng: z.number().min(-180).max(180),
  maxLng: z.number().min(-180).max(180),
  from: z.string().min(10).max(40),
  to: z.string().min(10).max(40),
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
  isFreeOnly: z.boolean().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

/**
 * Server action invoked from the client map whenever the viewport or
 * filters change. Performs light validation, then delegates to the
 * cached `getEventsInBbox` so pan/zoom gestures hit the shared cache
 * whenever possible.
 */
export async function fetchEventsInBbox(
  params: GetEventsInBboxParams,
): Promise<EventsMapMarker[]> {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return [];

  // Sanity: bbox must be a non-degenerate rectangle and not the whole world.
  const { minLat, maxLat, minLng, maxLng } = parsed.data;
  if (minLat >= maxLat || minLng >= maxLng) return [];
  if (maxLat - minLat > 10 || maxLng - minLng > 10) return [];

  return getEventsInBbox(parsed.data);
}
