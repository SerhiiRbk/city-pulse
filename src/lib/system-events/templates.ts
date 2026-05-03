/**
 * Static editorial templates for the Афиша composer. We don't store these
 * in the database for the MVP because the set is small (<10) and editing
 * them is a code change that should go through review like any UX copy.
 *
 * Each template is a partial form payload; the composer reads the query
 * string, merges defaults on top of an empty draft, and lets the editor
 * tweak anything before publishing.
 */

export interface SystemEventTemplate {
  id: string;
  /** i18n key under `admin.systemEvents.templates.items.<id>.label`. */
  labelKey: string;
  /** i18n key under `admin.systemEvents.templates.items.<id>.description`. */
  descriptionKey: string;
  emoji: string;
  /**
   * Pre-filled fields. Only fields the editor would routinely rewrite
   * verbatim live here — venue, exact date and partner stay blank.
   */
  defaults: {
    title?: string;
    pitch?: string;
    description?: string;
    duration_minutes?: number;
    is_free?: boolean;
  };
}

export const SYSTEM_EVENT_TEMPLATES: SystemEventTemplate[] = [
  {
    id: 'open-air-concert',
    labelKey: 'openAirConcert.label',
    descriptionKey: 'openAirConcert.description',
    emoji: '🎸',
    defaults: {
      duration_minutes: 180,
      is_free: false,
    },
  },
  {
    id: 'farmers-market',
    labelKey: 'farmersMarket.label',
    descriptionKey: 'farmersMarket.description',
    emoji: '🥖',
    defaults: {
      duration_minutes: 360,
      is_free: true,
    },
  },
  {
    id: 'gallery-opening',
    labelKey: 'galleryOpening.label',
    descriptionKey: 'galleryOpening.description',
    emoji: '🖼️',
    defaults: {
      duration_minutes: 150,
      is_free: true,
    },
  },
  {
    id: 'film-festival',
    labelKey: 'filmFestival.label',
    descriptionKey: 'filmFestival.description',
    emoji: '🎬',
    defaults: {
      duration_minutes: 240,
      is_free: false,
    },
  },
  {
    id: 'street-food-fair',
    labelKey: 'streetFoodFair.label',
    descriptionKey: 'streetFoodFair.description',
    emoji: '🌮',
    defaults: {
      duration_minutes: 480,
      is_free: true,
    },
  },
  {
    id: 'book-launch',
    labelKey: 'bookLaunch.label',
    descriptionKey: 'bookLaunch.description',
    emoji: '📚',
    defaults: {
      duration_minutes: 90,
      is_free: true,
    },
  },
];

/**
 * Encodes a template as a query string fragment for `/composer/new`. We
 * keep this tiny and deliberately do NOT serialise free-form text — the
 * composer expects clean defaults and merges them on first render only.
 */
export function templateToQueryString(template: SystemEventTemplate): string {
  const params = new URLSearchParams({ template: template.id });
  return params.toString();
}
