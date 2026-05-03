/**
 * Shared Stadia Maps tile configuration. Centralising the style here keeps
 * the events map and all embedded single-event maps visually consistent.
 *
 * We use `osm_bright` instead of `alidade_smooth` because the map is meant
 * for discovering *what is around* a location — users want to see cafés,
 * restaurants, shops, museums, and house numbers at street level. The
 * minimalist Alidade style strips most of those details to keep the canvas
 * clean, which reads as "empty map" in a dense city center.
 *
 * All Stadia styles share the same tile URL scheme; switch the style below
 * (or per-call) to experiment without touching consumers.
 */

export const STADIA_STYLE_DEFAULT = 'osm_bright' as const;

export const STADIA_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export function buildStadiaTileUrl(style: string = STADIA_STYLE_DEFAULT): string {
  const key = process.env.NEXT_PUBLIC_STADIA_API_KEY;
  const base = `https://tiles.stadiamaps.com/tiles/${style}/{z}/{x}/{y}{r}.png`;
  return key ? `${base}?api_key=${key}` : base;
}
