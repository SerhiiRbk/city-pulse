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

      // Honor redirectTo param (e.g. from invite link flow)
      const redirectTo = searchParams.get('redirectTo');
      if (redirectTo && redirectTo.startsWith('/')) {
        return NextResponse.redirect(`${origin}/${locale}${redirectTo}`);
      }

      return NextResponse.redirect(`${origin}/${locale}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
