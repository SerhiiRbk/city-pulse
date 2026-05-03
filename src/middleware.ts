import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const GROUP_SLUG_RE = /^\/(?:(en|ru|uk|cs|de)\/)?groups\/(global|[a-z]{2})\/([a-z0-9][a-z0-9-]*[a-z0-9])$/i;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const match = pathname.match(GROUP_SLUG_RE);
  if (match) {
    const locale = match[1] || routing.defaultLocale;
    const country = match[2];
    const slug = match[3];
    const resolveUrl = new URL('/api/groups/resolve', request.url);
    resolveUrl.searchParams.set('country', country);
    resolveUrl.searchParams.set('slug', slug);
    resolveUrl.searchParams.set('locale', locale);
    return NextResponse.redirect(resolveUrl);
  }

  // Make the current pathname readable by Server Components via
  // `headers()`, which lets the OnboardingGuard component decide
  // whether to redirect without an extra DB roundtrip.
  request.headers.set('x-pathname', pathname);

  const intlResponse = intlMiddleware(request);

  const supabaseResponse = await updateSession(request);

  supabaseResponse.headers.forEach((value, key) => {
    intlResponse.headers.set(key, value);
  });
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  intlResponse.headers.set('x-pathname', pathname);
  return intlResponse;
}

export const config = {
  matcher: ['/', '/(en|ru|uk|cs|de)/:path*'],
};
