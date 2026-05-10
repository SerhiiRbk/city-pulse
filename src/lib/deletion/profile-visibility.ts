/**
 * Pure function that determines whether a profile is publicly visible.
 *
 * A profile is visible in public queries (search, event attendees, contacts)
 * if and only if:
 * - deleted_at is null (not soft-deleted)
 * - is_private is false (not a private profile)
 * - is_blocked is false (not blocked)
 *
 * This mirrors the RLS policy on the profiles table:
 *   USING (is_private = false AND deleted_at IS NULL AND is_blocked = false)
 */
export function isProfilePubliclyVisible(profile: {
  deleted_at: string | null;
  is_private: boolean;
  is_blocked: boolean;
}): boolean {
  return profile.deleted_at === null && !profile.is_private && !profile.is_blocked;
}
