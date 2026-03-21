import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canViewBlockedOwnedResource, getViewerContext } from '@/lib/server/viewer-context';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country');
  const slug = searchParams.get('slug');
  const locale = searchParams.get('locale') || 'en';

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const isGlobal = !country || country.toLowerCase() === 'global';

  const supabase = await createClient();
  const viewer = await getViewerContext();
  let query = supabase
    .from('groups_with_counts')
    .select('id, created_by, is_blocked, creator_is_blocked')
    .eq('slug', slug.toLowerCase());

  if (isGlobal) {
    query = query.is('country', null);
  } else {
    query = query.eq('country', country!.toUpperCase());
  }

  const { data } = await query.maybeSingle();

  if (!data) {
    return NextResponse.redirect(new URL(`/${locale}/groups`, request.url));
  }

  if (!canViewBlockedOwnedResource(viewer, data.created_by, {
    isBlocked: data.is_blocked,
    ownerBlocked: data.creator_is_blocked,
  })) {
    return NextResponse.redirect(new URL(`/${locale}/groups`, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}/groups/${data.id}`, request.url));
}
