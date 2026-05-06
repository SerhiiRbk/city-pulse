'use client';

const STORAGE_KEY = 'localisio:event-filters';

export interface SavedFilters {
  city_id?: string;
  city?: string;
  country?: string;
  category?: string;
  language?: string;
}

/**
 * Persists the user's last-used location/filter preferences to localStorage.
 * Used as a fallback when the user visits /events without explicit URL params
 * and geo-detection doesn't resolve (e.g. VPN, localhost).
 */
export function saveFilters(filters: SavedFilters): void {
  try {
    // Only save non-empty values
    const toSave: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) toSave[k] = v;
    });
    if (Object.keys(toSave).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  } catch {
    // localStorage unavailable (SSR, private browsing)
  }
}

export function loadSavedFilters(): SavedFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFilters;
  } catch {
    return null;
  }
}

export function clearSavedFilters(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
