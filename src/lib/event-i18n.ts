/**
 * Resolves localized event title and description.
 *
 * Priority:
 * 1. If `title_translations[locale]` exists → use it
 * 2. Otherwise → use the default `title` field
 *
 * Same logic for description.
 */

export function resolveEventTitle(
  event: { title: string; title_translations?: Record<string, string> | null },
  locale: string,
): string {
  if (event.title_translations && event.title_translations[locale]) {
    return event.title_translations[locale];
  }
  return event.title;
}

export function resolveEventDescription(
  event: { description: string | null; description_translations?: Record<string, string> | null },
  locale: string,
): string | null {
  if (event.description_translations && event.description_translations[locale]) {
    return event.description_translations[locale];
  }
  return event.description;
}