/**
 * Display utilities for deleted/anonymized users.
 *
 * Provides helpers to detect the sentinel UUID and resolve the
 * locale-appropriate "Deleted User" label for profile display.
 */

import { SENTINEL_UUID } from '@/lib/deletion/anonymize';
import { getAnonymizedUserLabel } from '@/lib/deletion/locale';

/**
 * Checks whether a user ID is the sentinel UUID used for anonymized content.
 */
export function isSentinelUser(userId: string): boolean {
  return userId === SENTINEL_UUID;
}

/**
 * Resolves the display name for a profile, returning the locale-appropriate
 * anonymized user label when the profile belongs to the sentinel UUID.
 *
 * Use this in profile display contexts where the viewer's locale is known
 * and the sentinel profile should show a translated label instead of the
 * database-stored "Deleted User" (English).
 *
 * @param userId - The profile's user ID
 * @param displayName - The display_name from the database
 * @param viewerLocale - The current viewer's locale (e.g. 'en', 'ru', 'cs')
 * @returns The resolved display name (locale-specific for sentinel, original otherwise)
 */
export function resolveDisplayName(
  userId: string,
  displayName: string | null,
  viewerLocale: string,
): string {
  if (isSentinelUser(userId)) {
    return getAnonymizedUserLabel(viewerLocale);
  }
  return displayName || '';
}
