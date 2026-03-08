import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  let query = supabase
    .from('groups')
    .select('id')
    .eq('slug', slug.toLowerCase());

  if (isGlobal) {
    query = query.is('country', null);
  } else {
    query = query.eq('country', country!.toUpperCase());
  }

  const { data } = await query.single();

  if (!data) {
    return NextResponse.redirect(new URL(`/${locale}/groups`, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}/groups/${data.id}`, request.url));
}
