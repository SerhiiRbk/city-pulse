import { createClient } from '@/lib/supabase/server';

export type ViewerRole = 'user' | 'moderator' | 'admin' | 'system' | null;

export interface ViewerContext {
  userId: string | null;
  role: ViewerRole;
  isAdmin: boolean;
  isModerator: boolean;
}

export async function getViewerContext(): Promise<ViewerContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      role: null,
      isAdmin: false,
      isModerator: false,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as ViewerRole | undefined) || 'user';

  return {
    userId: user.id,
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
  };
}

export function canViewBlockedOwnedResource(
  viewer: ViewerContext,
  ownerId: string | null | undefined,
  options: {
    isBlocked?: boolean | null;
    ownerBlocked?: boolean | null;
  },
) {
  const restricted = Boolean(options.isBlocked || options.ownerBlocked);
  if (!restricted) return true;
  if (viewer.isAdmin) return true;
  return Boolean(ownerId && viewer.userId === ownerId);
}

export function canViewBlockedProfile(
  viewer: ViewerContext,
  profileId: string,
  isBlocked?: boolean | null,
) {
  if (!isBlocked) return true;
  if (viewer.isAdmin) return true;
  return viewer.userId === profileId;
}
