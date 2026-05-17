import { findSupportedCity, matchGeoCity } from '@/lib/cities';
import { findCityByGeo } from '@/lib/actions/geo-city';
import { getCityById } from '@/lib/actions/cities';
import { getUserProfile } from '@/lib/actions/auth';
import { getVisitorGeo } from '@/lib/geo';
import { cityHasContent } from '@/lib/actions/landing-cached';

export interface CityFilterResult {
  cityId?: string; // UUID from cities table
  cityName?: string; // dbName for DB queries
  country?: string; // country code
  isAutoDetected: boolean; // true if from geo/profile (not explicit)
  detectedCity: { id: string; name: string; country: string } | null; // for CityPicker initialCity
}

/**
 * Resolves the city filter using a consistent priority:
 *
 * 1. URL path (`citySlug`) — highest priority, explicit choice
 * 2. Query param (`cityParam` / `cityIdParam`) — explicit choice via filter
 * 3. User profile (`profile.city`) — only if no explicit choice AND user is logged in
 * 4. Geo-detection (Vercel `x-vercel-ip-city` header) — only if no explicit choice AND no profile city
 * 5. Empty (all cities) — if nothing determined
 *
 * `geoOff` blocks auto-detection (priorities 3 and 4) for that request.
 * Auto-detected city (geo/profile) only applies if the city has content.
 */
export async function resolveCityFilter(params: {
  // From URL/query
  citySlug?: string; // from /cities/[city]/events path
  cityParam?: string; // from ?city= query param
  cityIdParam?: string; // from ?city_id= query param
  countryParam?: string; // from ?country= query param
  geoOff?: boolean; // from ?geo_off=1
  // Context
  userId?: string; // logged-in user ID (to check profile)
}): Promise<CityFilterResult> {
  const { citySlug, cityParam, cityIdParam, countryParam, geoOff, userId } = params;

  // --- Priority 1: URL path (city slug from rewrite) ---
  if (citySlug) {
    const supported = findSupportedCity(citySlug);
    if (supported) {
      // Resolve from DB so we have the UUID for the picker
      const resolved = await findCityByGeo(supported.dbName, undefined);
      return {
        cityId: resolved?.id,
        cityName: supported.dbName,
        country: resolved?.country ?? undefined,
        isAutoDetected: false,
        detectedCity: resolved
          ? { id: resolved.id, name: resolved.name, country: resolved.country }
          : null,
      };
    }
  }

  // --- Priority 2: Query params (explicit filter) ---
  if (cityIdParam) {
    const city = await getCityById(cityIdParam);
    if (city) {
      return {
        cityId: city.id,
        cityName: city.name,
        country: city.country ?? undefined,
        isAutoDetected: false,
        detectedCity: { id: city.id, name: city.name, country: city.country },
      };
    }
  }

  if (cityParam) {
    // Could be a supported city slug or a DB name
    const supported = findSupportedCity(cityParam);
    const dbName = supported ? supported.dbName : cityParam;
    const resolved = await findCityByGeo(dbName, undefined);
    return {
      cityId: resolved?.id,
      cityName: dbName,
      country: countryParam ?? resolved?.country ?? undefined,
      isAutoDetected: false,
      detectedCity: resolved
        ? { id: resolved.id, name: resolved.name, country: resolved.country }
        : null,
    };
  }

  if (countryParam) {
    // Country-only filter (no city) — still explicit
    return {
      cityId: undefined,
      cityName: undefined,
      country: countryParam,
      isAutoDetected: false,
      detectedCity: null,
    };
  }

  // --- Auto-detection blocked by geo_off ---
  if (geoOff) {
    return {
      isAutoDetected: false,
      detectedCity: null,
    };
  }

  // --- Priority 3: User profile city (logged-in users skip geo-detection) ---
  if (userId) {
    const profile = await getUserProfile();
    if (profile?.city_id && profile?.city) {
      // Profile stores localized city name (e.g. "Прага") but events use
      // the English name ("Prague"). Resolve via city_id → cities table.
      const cityRecord = await getCityById(profile.city_id);
      const englishName = cityRecord?.translations?.en ?? cityRecord?.name ?? profile.city;
      const hasContent = await cityHasContent(englishName);
      if (hasContent) {
        return {
          cityId: profile.city_id,
          cityName: englishName,
          country: profile.country ?? undefined,
          isAutoDetected: true,
          detectedCity: {
            id: profile.city_id,
            name: cityRecord?.name ?? profile.city,
            country: profile.country ?? '',
          },
        };
      }
    }
    // Logged-in user with no city in profile or city has no content → show all
    return {
      isAutoDetected: false,
      detectedCity: null,
    };
  }

  // --- Priority 4: Geo-detection (only for anonymous users) ---
  const geo = await getVisitorGeo();
  if (geo.city) {
    // First try matching against supported cities list (fast, no DB call)
    const geoMatch = matchGeoCity(geo.city);
    if (geoMatch) {
      const hasContent = await cityHasContent(geoMatch.dbName);
      if (hasContent) {
        // Resolve from DB to get the UUID
        const resolved = await findCityByGeo(geo.city, geo.country);
        return {
          cityId: resolved?.id,
          cityName: geoMatch.dbName,
          country: resolved?.country ?? geo.country ?? undefined,
          isAutoDetected: true,
          detectedCity: resolved
            ? { id: resolved.id, name: resolved.name, country: resolved.country }
            : null,
        };
      }
    } else {
      // Not a supported city but might still be in our DB
      const resolved = await findCityByGeo(geo.city, geo.country);
      if (resolved) {
        const hasContent = await cityHasContent(resolved.name);
        if (hasContent) {
          return {
            cityId: resolved.id,
            cityName: resolved.name,
            country: resolved.country ?? undefined,
            isAutoDetected: true,
            detectedCity: {
              id: resolved.id,
              name: resolved.name,
              country: resolved.country,
            },
          };
        }
      }
    }
  }

  // --- Priority 5: Empty (all cities) ---
  return {
    isAutoDetected: false,
    detectedCity: null,
  };
}
