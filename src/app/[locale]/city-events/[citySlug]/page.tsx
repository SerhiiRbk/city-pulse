import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { CityEventsContent } from '../_shared/city-events-content';

/**
 * Maps URL slugs to the city name stored in the database.
 * URLs: /city-events/city-prague, /city-events/city-tel-aviv, etc.
 */
const SLUG_TO_CITY: Record<string, string> = {
  prague: 'Prague',
  brno: 'Brno',
  vienna: 'Vienna',
  berlin: 'Berlin',
  munich: 'Munich',
  warsaw: 'Warsaw',
  bratislava: 'Bratislava',
  budapest: 'Budapest',
  barcelona: 'Barcelona',
  valencia: 'Valencia',
  'tel-aviv': 'Tel Aviv',
  ubud: 'Ubud',
  montevideo: 'Montevideo',
};

type Props = {
  params: Promise<{ locale: string; citySlug: string }>;
};

function resolveCity(citySlug: string): string | null {
  const slug = (citySlug ?? '').replace(/^city-/, '').toLowerCase();
  return SLUG_TO_CITY[slug] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  const cityName = resolveCity(citySlug);
  const t = await getTranslations({ locale, namespace: 'cityEvents' });

  if (!cityName) {
    return { title: t('title') };
  }

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/city-events/${citySlug}`,
    title: `${t('title')} — ${cityName}`,
    description: `${t('subtitle')} ${cityName}`,
  });
}

export default async function CitySlugPage({ params }: Props) {
  const { locale, citySlug } = await params;
  setRequestLocale(locale);

  const cityName = resolveCity(citySlug);

  if (!cityName) {
    notFound();
  }

  return <CityEventsContent filters={{ city: cityName }} />;
}
