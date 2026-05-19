import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/config';
import { SUPPORTED_CITIES } from '@/lib/cities';

/**
 * City events SEO landing page.
 * URL: /en/cities/prague/events
 *
 * This route is served via a Next.js rewrite in next.config.ts:
 *   /en/cities/:city/events → /en/events?city=:city
 *
 * The rewrite means the events page component handles rendering.
 * This file provides:
 * - generateMetadata: unique SEO title/description per city+locale
 * - generateStaticParams: pre-generates all city/locale combinations
 *
 * Target search queries:
 * - "мероприятия в Праге"
 * - "events in Prague"
 * - "akce v Praze"
 * - "Veranstaltungen in Prag"
 * - "eventos en Praga"
 */

type Props = {
  params: Promise<{ locale: string; city: string }>;
};

function resolveCity(slug: string) {
  return SUPPORTED_CITIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * SEO-optimized descriptions per locale.
 * These target long-tail search queries like "мероприятия в Праге для экспатов".
 */
const SEO_TEMPLATES: Record<string, {
  title: (city: string) => string;
  description: (city: string) => string;
}> = {
  en: {
    title: (city) => `Events in ${city} — find people to go with`,
    description: (city) => `Discover events in ${city}: concerts, exhibitions, language exchanges, walks, board games, and more. Join a small crew or create your own — never go alone.`,
  },
  ru: {
    title: (city) => `Мероприятия в городе ${city} — найди компанию`,
    description: (city) => `Мероприятия в ${city}: концерты, выставки, языковые обмены, прогулки, настольные игры и многое другое. Присоединяйся к компании или создай свою — не ходи один.`,
  },
  uk: {
    title: (city) => `Заходи у місті ${city} — знайди компанію`,
    description: (city) => `Заходи у ${city}: концерти, виставки, мовні обміни, прогулянки, настільні ігри та багато іншого. Приєднуйся до компанії або створи свою — не йди сам.`,
  },
  cs: {
    title: (city) => `Akce v ${city} — najdi partu`,
    description: (city) => `Akce v ${city}: koncerty, výstavy, jazykové výměny, procházky, deskové hry a další. Přidej se k partě nebo si vytvoř vlastní — nechoď sám.`,
  },
  de: {
    title: (city) => `Veranstaltungen in ${city} — finde eine Crew`,
    description: (city) => `Veranstaltungen in ${city}: Konzerte, Ausstellungen, Sprachtandems, Spaziergänge, Brettspiele und mehr. Schließ dich einer Crew an oder erstelle deine eigene.`,
  },
  es: {
    title: (city) => `Eventos en ${city} — encuentra tu crew`,
    description: (city) => `Eventos en ${city}: conciertos, exposiciones, intercambios de idiomas, paseos, juegos de mesa y más. Únete a un crew o crea el tuyo — no vayas solo.`,
  },
};

export async function generateStaticParams() {
  const params: { locale: string; city: string }[] = [];
  for (const locale of locales) {
    for (const city of SUPPORTED_CITIES) {
      params.push({
        locale,
        city: city.slug.toLowerCase().replace(/\s+/g, '-'),
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params;
  const matched = resolveCity(city);

  if (!matched) {
    const t = await getTranslations({ locale, namespace: 'events' });
    return { title: t('title') };
  }

  const cityLabel = matched.labels[locale] || matched.labels.en;
  const template = SEO_TEMPLATES[locale] || SEO_TEMPLATES.en;

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${city.toLowerCase().replace(/\s+/g, '-')}/events`,
    title: template.title(cityLabel),
    description: template.description(cityLabel),
  });
}

export default async function CityEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Content is served via rewrite to /events?city=:city.
  // This component exists for generateMetadata + generateStaticParams.
  return null;
}
