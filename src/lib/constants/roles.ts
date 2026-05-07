/**
 * Roles that an admin is allowed to assign through the UI.
 * `'system'` is intentionally excluded — it's reserved for the
 * Афиша/system-events service account and shouldn't be reachable
 * by point-and-click.
 */
export const ASSIGNABLE_ROLES = ['user', 'moderator', 'admin'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
