import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  const localizedDisallow = locales.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/messages`,
    `/${locale}/events/create`,
    `/${locale}/events/*/edit`,
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
