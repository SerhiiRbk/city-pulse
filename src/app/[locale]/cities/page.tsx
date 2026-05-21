import { setRequestLocale } from 'next-intl/server';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { locales, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { buildPageMetadata } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { MapPin, Users } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

const meta: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Cities — Localisio',
    description: 'Find events and communities in cities across Europe and beyond.',
  },
  ru: {
    title: 'Города — Localisio',
    description: 'Находите мероприятия и сообщества в городах Европы и не только.',
  },
  uk: {
    title: 'Міста — Localisio',
    description: 'Знаходьте заходи та спільноти у містах Європи та не тільки.',
  },
  cs: {
    title: 'Města — Localisio',
    description: 'Najděte akce a komunity ve městech Evropy i jinde.',
  },
  de: {
    title: 'Städte — Localisio',
    description: 'Finde Events und Communities in Städten in Europa und darüber hinaus.',
  },
  es: {
    title: 'Ciudades — Localisio',
    description: 'Encuentra eventos y comunidades en ciudades de Europa y más allá.',
  },
};

const linkLabels: Record<string, { events: string; groups: string }> = {
  en: { events: 'Events', groups: 'Groups' },
  ru: { events: 'Мероприятия', groups: 'Сообщества' },
  uk: { events: 'Заходи', groups: 'Спільноти' },
  cs: { events: 'Akce', groups: 'Komunity' },
  de: { events: 'Events', groups: 'Communities' },
  es: { events: 'Eventos', groups: 'Comunidades' },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = meta[locale] || meta.en;

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/cities',
    title,
    description,
  });
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function CitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { title, description } = meta[locale] || meta.en;
  const labels = linkLabels[locale] || linkLabels.en;

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: title.split(' — ')[0], url: `/${locale}/cities` },
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title.split(' — ')[0]}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTED_CITIES.map((city) => {
          const citySlug = city.slug.toLowerCase().replace(/\s+/g, '-');
          const cityName = city.labels[locale] || city.labels.en;

          return (
            <div
              key={city.slug}
              className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/cities/${citySlug}/events`} className="block">
                <div className="relative h-36 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={city.image.replace('w=1200', 'w=600')}
                    alt={cityName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <h2 className="absolute bottom-3 left-4 text-lg font-semibold text-white drop-shadow-sm">
                    {cityName}
                  </h2>
                </div>
              </Link>
              <div className="flex gap-2 p-4">
                <Link
                  href={`/cities/${citySlug}/events`}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{labels.events}</span>
                </Link>
                <Link
                  href={`/cities/${citySlug}/groups`}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  <span>{labels.groups}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
