import { headers } from 'next/headers';

export interface VisitorGeo {
  country: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
}

/**
 * Reads Vercel's automatic geo-detection headers.
 * These are populated on every request when deployed to Vercel.
 * Returns nulls in local development (headers won't be present).
 */
export async function getVisitorGeo(): Promise<VisitorGeo> {
  const h = await headers();
  return {
    country: h.get('x-vercel-ip-country'),
    city: h.get('x-vercel-ip-city'),
    latitude: h.get('x-vercel-ip-latitude'),
    longitude: h.get('x-vercel-ip-longitude'),
  };
}
