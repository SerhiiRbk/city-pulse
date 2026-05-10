import { createClient } from '@/lib/supabase/server';
import { checkReactivation } from '@/lib/actions/deletion/check-reactivation';
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

      // Check if user has a pending deletion request (reactivation flow)
      const reactivationResult = await checkReactivation();
      if (reactivationResult.needsReactivation && reactivationResult.expiresAt) {
        const reactivateUrl = new URL(`${origin}/${locale}/reactivate`);
        reactivateUrl.searchParams.set('expiresAt', reactivationResult.expiresAt);
        return NextResponse.redirect(reactivateUrl.toString());
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
