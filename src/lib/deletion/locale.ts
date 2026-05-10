/**
 * Locale utilities for account deletion.
 * Handles email locale determination and anonymized user label resolution.
 */

export const SUPPORTED_LOCALES = ['en', 'ru', 'uk', 'cs', 'de'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Locale-specific labels for the anonymized user placeholder.
 * Displayed in place of a deleted user's name, resolved per viewer locale.
 */
export const ANONYMIZED_USER_LABELS: Record<SupportedLocale, string> = {
  en: 'Deleted User',
  ru: 'Удалённый пользователь',
  uk: 'Видалений користувач',
  cs: 'Smazaný uživatel',
  de: 'Gelöschter Benutzer',
};

/**
 * Determines the email locale from a user's languages array.
 * Returns languages[0] if it is a supported locale, otherwise falls back to 'en'.
 */
export function determineEmailLocale(languages: string[] | null): string {
  if (!languages || languages.length === 0) {
    return 'en';
  }

  const preferred = languages[0];

  if (SUPPORTED_LOCALES.includes(preferred as SupportedLocale)) {
    return preferred;
  }

  return 'en';
}

/**
 * Returns the locale-specific anonymized user label for a given viewer locale.
 * Falls back to 'en' ("Deleted User") if the locale is not supported.
 */
export function getAnonymizedUserLabel(viewerLocale: string): string {
  if (SUPPORTED_LOCALES.includes(viewerLocale as SupportedLocale)) {
    return ANONYMIZED_USER_LABELS[viewerLocale as SupportedLocale];
  }

  return ANONYMIZED_USER_LABELS.en;
}
