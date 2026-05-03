import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Server-side guard that redirects authenticated users with no
 * `onboarded_at` timestamp to /<locale>/onboarding. Skips public
 * areas (auth flows, the onboarding page itself, raw API routes,
 * cron, ical feeds, etc.) so we never trap the user in a loop.
 *
 * Hidden behind the `onboarding_wizard` feature flag so we can
 * roll the wizard out gradually without a redeploy.
 */

const SKIP_PATH_FRAGMENTS = [
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/auth/callback',
  '/api/',
  '/terms',
  '/privacy',
];

function shouldSkipPath(pathname: string): boolean {
  return SKIP_PATH_FRAGMENTS.some((fragment) => pathname.includes(fragment));
}

function pathnameToLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return match?.[1] ?? 'en';
}

export async function OnboardingGuard() {
  const hdrs = await headers();
  // `next/headers` exposes the request URL via x-pathname when set
  // by middleware; otherwise we fall back to x-url. We pick the
  // first one that gives us something usable.
  const pathname =
    hdrs.get('x-pathname') ??
    hdrs.get('next-url') ??
    new URL(hdrs.get('referer') ?? 'http://localhost/').pathname;

  if (shouldSkipPath(pathname)) return null;

  let profile = null;
  try {
    profile = await getUserProfile();
  } catch {
    return null;
  }

  if (!profile) return null;
  if (profile.onboarded_at) return null;

  const enabled = await isFeatureEnabled('onboarding_wizard', profile.id);
  if (!enabled) return null;

  const locale = pathnameToLocale(pathname);
  redirect(`/${locale}/onboarding`);
}
