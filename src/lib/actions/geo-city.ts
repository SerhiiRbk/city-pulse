'use server';

import { createClient } from '@/lib/supabase/server';
import type { City } from '@/types/database';

/**
 * Attempts to find a city in the database by its English name and
 * optional country code. Used to resolve Vercel's geo-detection
 * headers (which provide city names in English) into our internal
 * city_id for filtering.
 *
 * Falls back to a case-insensitive name match if no country is
 * provided. Returns null if no match is found — the caller should
 * gracefully degrade to showing all events.
 */
export async function findCityByGeo(
  cityName: string,
  countryCode?: string | null,
): Promise<City | null> {
  if (!cityName || cityName.length < 2) return null;

  const supabase = await createClient();

  // Try exact match with country first (most reliable).
  if (countryCode) {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .ilike('name', cityName)
      .eq('country', countryCode.toUpperCase())
      .limit(1)
      .maybeSingle();

    if (data) return data as City;

    // Also check English translation (Vercel sends "Prague" but DB might store "Praha").
    const { data: byEnTranslation } = await supabase
      .from('cities')
      .select('*')
      .eq('country', countryCode.toUpperCase())
      .ilike('translations->>en', cityName)
      .limit(1)
      .maybeSingle();

    if (byEnTranslation) return byEnTranslation as City;
  }

  // Fallback: match by name only (less precise but better than nothing).
  const { data } = await supabase
    .from('cities')
    .select('*')
    .ilike('name', cityName)
    .limit(1)
    .maybeSingle();

  if (data) return data as City;

  // Also try English translation (e.g. "Prague" when DB stores "Прага").
  const { data: byTranslation } = await supabase
    .from('cities')
    .select('*')
    .ilike('translations->>en', cityName)
    .limit(1)
    .maybeSingle();

  return (byTranslation as City) || null;
}
