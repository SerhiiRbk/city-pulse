'use server';

import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/server/viewer-context';

/**
 * Roles that an admin is allowed to assign through the UI.
 * `'system'` is intentionally excluded — it's reserved for the
 * Афиша/system-events service account and shouldn't be reachable
 * by point-and-click. To create a `system` user, do it once in
 * SQL editor.
 */
export const ASSIGNABLE_ROLES = ['user', 'moderator', 'admin'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === 'string' &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

function revalidateAdminPaths() {
  // Both panels render the role badge; the audit log derives from
  // the same change. Pre-warm them across all locales so admins
  // don't see stale data after toggling.
  for (const locale of locales) {
    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/audit-log`);
  }
}

export async function setUserRole(targetUserId: string, role: AssignableRole) {
  const viewer = await getViewerContext();
  if (!viewer.isAdmin) {
    return { error: 'Admin access required' as const };
  }

  if (!isAssignableRole(role)) {
    return { error: 'Invalid role' as const };
  }

  if (!targetUserId || typeof targetUserId !== 'string') {
    return { error: 'Invalid user id' as const };
  }

  // Belt-and-braces self-protection. The SQL trigger enforces this
  // too, but checking here turns the failure into a friendly toast
  // instead of a Postgres exception bubbling up to the client.
  if (targetUserId === viewer.userId) {
    return { error: 'You cannot change your own role' as const };
  }

  const supabase = await createClient();

  // Confirm the target exists and read the current role so we can
  // short-circuit no-op writes (those would still hit the trigger
  // and waste an audit-log row).
  const { data: target, error: readError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', targetUserId)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!target) return { error: 'User not found' as const };

  if (target.role === role) {
    return { success: true, unchanged: true as const };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId);

  if (updateError) {
    // The "last-admin" trigger raises a Postgres exception that
    // surfaces here. Forward the human-readable message; Supabase
    // sends `Cannot demote the last remaining admin` verbatim.
    return { error: updateError.message };
  }

  revalidateAdminPaths();

  return { success: true, unchanged: false as const };
}
