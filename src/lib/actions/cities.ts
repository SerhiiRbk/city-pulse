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

export async function upsertCityFromNominatim(params: {
  name: string;
  country: string;
  lat: number;
  lng: number;
  translations?: Record<string, string>;
}): Promise<City | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('cities')
    .select('*')
    .eq('name', params.name)
    .eq('country', params.country)
    .single();

  if (existing) return existing as City;

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
