import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const referer = request.headers.get('referer') || '/';
  return NextResponse.redirect(new URL(referer), { status: 302 });
}
