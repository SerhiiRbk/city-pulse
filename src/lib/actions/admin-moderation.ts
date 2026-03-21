'use server';

import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/server/viewer-context';

async function requireAdmin() {
  const viewer = await getViewerContext();
  if (!viewer.isAdmin) {
    return { error: 'Admin access required' as const };
  }

  return { viewer };
}

function revalidateLocalizedPaths(paths: string[]) {
  for (const locale of locales) {
    for (const currentPath of paths) {
      if (currentPath === '/') {
        revalidatePath(`/${locale}`);
        revalidatePath(`/${locale}/`);
        continue;
      }

      revalidatePath(`/${locale}${currentPath}`);
      revalidatePath(`/${locale}${currentPath}/`);
    }
  }
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const access = await requireAdmin();
  if ('error' in access) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_blocked: blocked })
    .eq('id', userId);

  if (error) return { error: error.message };

  revalidateLocalizedPaths([
    '/',
    '/admin',
    '/admin/users',
    `/profile/${userId}`,
    '/events',
    '/groups',
    '/calendar',
    '/city-events',
  ]);

  return { success: true };
}

export async function setEventBlocked(eventId: string, blocked: boolean) {
  const access = await requireAdmin();
  if ('error' in access) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ is_blocked: blocked })
    .eq('id', eventId);

  if (error) return { error: error.message };

  revalidateLocalizedPaths([
    '/',
    '/admin',
    '/admin/events',
    `/events/${eventId}`,
    '/events',
    '/calendar',
    '/city-events',
  ]);

  return { success: true };
}

export async function setGroupBlocked(groupId: string, blocked: boolean) {
  const access = await requireAdmin();
  if ('error' in access) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from('groups')
    .update({ is_blocked: blocked })
    .eq('id', groupId);

  if (error) return { error: error.message };

  revalidateLocalizedPaths([
    '/',
    '/admin',
    '/admin/groups',
    `/groups/${groupId}`,
    '/groups',
  ]);

  return { success: true };
}
