/**
 * Deterministic color for an event category, used for map markers and
 * cluster badges. We hash the category id into an HSL hue, keeping
 * saturation and lightness fixed so the palette stays cohesive.
 *
 * Using UUIDs (rather than slugs) keeps colors stable even if a slug
 * is renamed in translations.
 */

const DEFAULT_HUE = 215; // blue — used when category is unknown
const SATURATION = 70;
const LIGHTNESS = 52;
const LIGHTNESS_SOFT = 88; // for translucent halo

function hashHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function categoryHue(categoryId: string | null | undefined): number {
  if (!categoryId) return DEFAULT_HUE;
  return hashHue(categoryId);
}

export function categoryColor(categoryId: string | null | undefined): string {
  return `hsl(${categoryHue(categoryId)}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

export function categoryHalo(categoryId: string | null | undefined): string {
  return `hsl(${categoryHue(categoryId)}, ${SATURATION}%, ${LIGHTNESS_SOFT}%)`;
}

/**
 * Pick the dominant category across a set of events — used when building
 * cluster badges that need a single representative color.
 */
export function dominantCategoryId(
  events: { category_id: string | null }[],
): string | null {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.category_id) continue;
    counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
  }
  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return bestId;
}
