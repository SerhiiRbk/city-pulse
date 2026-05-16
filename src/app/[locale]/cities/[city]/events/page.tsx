import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { SUPPORTED_CITIES } from '@/lib/cities';

/**
 * City events SEO landing page.
 * URL: /en/cities/prague/events?category=hiking&sort=popular
 *
 * This route is served via a Next.js rewrite in next.config.ts:
 *   /en/cities/:city/events → /en/events?city=:city
 *
 * The URL stays as /cities/prague/events in the browser, but the
 * events page component handles the rendering with city filter.
 *
 * This file provides generateMetadata for SEO (unique title/description
 * per city). The page component itself is not used (rewrite handles it).
 */

type Props = {
  params: Promise<{ locale: string; city: string }>;
};

function resolveCity(slug: string) {
  return SUPPORTED_CITIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params;
  const matched = resolveCity(city);
  const t = await getTranslations({ locale, namespace: 'events' });

  if (!matched) {
    return { title: t('title') };
  }

  const cityLabel = matched.labels[locale] || matched.labels.en;

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${city}/events`,
    title: `${t('title')} — ${cityLabel}`,
    description: `${t('title')} ${cityLabel}`,
  });
}

export default async function CityEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // This page is served via rewrite — the events page handles rendering.
  // This component exists only for generateMetadata.
  return null;
}

