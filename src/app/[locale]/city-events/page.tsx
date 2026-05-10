import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import { CityEventsContent } from './_shared/city-events-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cityEvents' });

  return buildPageMetadata({
    locale,
    path: '/city-events',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function CityEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    city?: string;
    city_id?: string;
    country?: string;
    when?: string;
    date_from?: string;
    date_to?: string;
    geo_off?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;

  return <CityEventsContent filters={filters} />;
}
