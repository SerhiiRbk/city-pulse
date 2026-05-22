'use server';

import { createClient } from '@/lib/supabase/server';
import type { City } from '@/types/database';

export async function searchCities(query: string, country?: string): Promise<City[]> {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_cities', {
    query,
    country_filter: country || null,
  });

  if (error || !data) return [];
  return data as City[];
}

export async function getCityById(cityId: string): Promise<City | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cities')
    .select('*')
    .eq('id', cityId)
    .single();
  return data;
}

export async function getCityByName(name: string): Promise<City | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cities')
    .select('*')
    .eq('name', name)
    .maybeSingle();
  return data;
}

export async function upsertCityFromNominatim(params: {
  name: string;
  country: string;
  lat: number;
  lng: number;
  translations?: Record<string, string>;
}): Promise<City | null> {
  const supabase = await createClient();

  // First try exact name match
  const { data: existing } = await supabase
    .from('cities')
    .select('*')
    .eq('name', params.name)
    .eq('country', params.country)
    .single();

  if (existing) return existing as City;

  // Also try matching by any translation value (handles localized lookups)
  if (params.translations) {
    for (const translatedName of Object.values(params.translations)) {
      if (!translatedName) continue;
      const { data: byTranslation } = await supabase
        .from('cities')
        .select('*')
        .eq('country', params.country)
        .contains('translations', JSON.parse(`{"${Object.entries(params.translations).find(([, v]) => v === translatedName)?.[0] || 'en'}":"${translatedName}"}`))
        .maybeSingle();
      if (byTranslation) return byTranslation as City;
    }
    // Try matching name against any existing city name in same country with close coordinates
    const { data: nearby } = await supabase
      .from('cities')
      .select('*')
      .eq('country', params.country)
      .gte('lat', params.lat - 0.1)
      .lte('lat', params.lat + 0.1)
      .gte('lng', params.lng - 0.1)
      .lte('lng', params.lng + 0.1)
      .limit(1)
      .maybeSingle();
    if (nearby) return nearby as City;
  }

  const { data: inserted, error } = await supabase
    .from('cities')
    .insert({
      name: params.name,
      country: params.country,
      lat: params.lat,
      lng: params.lng,
      translations: params.translations || {},
    })
    .select()
    .single();

  if (error) return null;
  return inserted as City;
}

export async function resolveCity(cityName: string, countryCode: string, lat: number, lng: number): Promise<string | null> {
  const city = await upsertCityFromNominatim({
    name: cityName,
    country: countryCode,
    lat,
    lng,
  });
  return city?.id || null;
}
