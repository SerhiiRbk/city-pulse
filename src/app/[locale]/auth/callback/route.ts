import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = request.url.match(/\/(\w{2})\/auth\/callback/)?.[1] || 'en';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const type = searchParams.get('type');
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/${locale}/profile/edit`);
      }
      return NextResponse.redirect(`${origin}/${locale}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
