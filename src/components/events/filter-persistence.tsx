'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { saveFilters, loadSavedFilters, clearSavedFilters } from '@/lib/hooks/use-saved-filters';

/**
 * Invisible client component that handles filter persistence:
 *
 * 1. When the page loads with no location params and no geo_off flag,
 *    checks localStorage for saved filters and redirects if found.
 *
 * 2. When filters are active, saves them to localStorage for next visit.
 *
 * 3. When user clears filters (geo_off=1), clears localStorage too.
 */
export function FilterPersistence() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cityId = searchParams.get('city_id');
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const geoOff = searchParams.get('geo_off');

    const hasLocationInUrl = !!(cityId || city || country);

    if (geoOff === '1') {
      // User explicitly cleared — wipe saved filters
      clearSavedFilters();
      return;
    }

    if (hasLocationInUrl) {
      // Save current filters for next visit
      saveFilters({
        city_id: cityId || undefined,
        city: city || undefined,
        country: country || undefined,
        category: searchParams.get('category') || undefined,
        language: searchParams.get('language') || undefined,
      });
      return;
    }

    // No location in URL and no geo_off — try to restore from localStorage
    const saved = loadSavedFilters();
    if (saved && (saved.city_id || saved.city || saved.country)) {
      const params = new URLSearchParams();
      if (saved.city_id) params.set('city_id', saved.city_id);
      if (saved.city) params.set('city', saved.city);
      if (saved.country) params.set('country', saved.country);
      if (saved.category) params.set('category', saved.category);
      if (saved.language) params.set('language', saved.language);
      const qs = params.toString();
      if (qs) {
        router.replace(`${pathname}?${qs}`);
      }
    }
  }, [searchParams, pathname, router]);

  return null;
}
