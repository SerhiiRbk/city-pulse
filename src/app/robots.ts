import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  // On preview / non-production deployments we want crawlers to ignore
  // the entire host so duplicate content (preview vs prod) never enters
  // the index. `VERCEL_ENV` is set by the platform; locally it's
  // undefined so we treat that as "production-like" for the dev server.
  const isProduction =
    typeof process.env.VERCEL_ENV === 'undefined' || process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  const localizedDisallow = locales.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/messages`,
    `/${locale}/onboarding`,
    `/${locale}/settings`,
    `/${locale}/unsubscribe`,
    `/${locale}/events/create`,
    `/${locale}/events/*/edit`,
    `/${locale}/events/my`,
    `/${locale}/groups/create`,
    `/${locale}/groups/*/edit`,
    `/${locale}/profile/edit`,
    `/${locale}/login`,
    `/${locale}/register`,
    `/${locale}/forgot-password`,
    `/${locale}/verify-email`,
  ]);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', ...localizedDisallow],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
