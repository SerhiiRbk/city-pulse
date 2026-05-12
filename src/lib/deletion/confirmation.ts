/**
 * Confirmation word validation for account deletion.
 *
 * Each supported locale has a specific confirmation word that users must type
 * exactly (case-sensitive) to confirm account deletion.
 */

export const CONFIRMATION_WORDS: Record<string, string> = {
  en: 'DELETE',
  ru: 'УДАЛИТЬ',
  uk: 'ВИДАЛИТИ',
  cs: 'SMAZAT',
  de: 'LÖSCHEN',
  es: 'ELIMINAR',
};

/**
 * Validates that the user's input exactly matches the expected confirmation
 * word for the given locale (case-sensitive).
 *
 * Returns false for unsupported locales.
 */
export function validateConfirmationWord(locale: string, input: string): boolean {
  const expected = CONFIRMATION_WORDS[locale];
  if (expected === undefined) {
    return false;
  }
  return input === expected;
}
