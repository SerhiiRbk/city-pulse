import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/config';
import { SUPPORTED_CITIES } from '@/lib/cities';

/**
 * City groups SEO landing page.
 * URL: /en/cities/prague/groups
 *
 * This route is served via a Next.js rewrite in next.config.ts:
 *   /en/cities/:city/groups → /en/groups?city=:city
 *
 * The rewrite means the groups page component handles rendering.
 * This file provides:
 * - generateMetadata: unique SEO title/description per city+locale
 * - generateStaticParams: pre-generates all city/locale combinations
 *
 * Target search queries:
 * - "группы в Праге"
 * - "groups in Prague"
 * - "skupiny v Praze"
 * - "Gruppen in Prag"
 * - "grupos en Praga"
 */

type Props = {
  params: Promise<{ locale: string; city: string }>;
};

function resolveCity(slug: string) {
  return SUPPORTED_CITIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * SEO-optimized titles and descriptions per locale.
 * These target long-tail search queries like "группы в Праге для экспатов".
 */
const SEO_TEMPLATES: Record<string, {
  title: (city: string) => string;
  description: (city: string) => string;
}> = {
  en: {
    title: (city) => `Groups in ${city} — join a community`,
    description: (city) => `Find communities and groups in ${city}: language exchanges, sports, board games, tech meetups, and more. Join a group or create your own.`,
  },
  ru: {
    title: (city) => `Группы в городе ${city} — присоединяйся к сообществу`,
    description: (city) => `Группы и сообщества в ${city}: языковые обмены, спорт, настольные игры, IT-митапы и многое другое. Присоединяйся или создай свою группу.`,
  },
  uk: {
    title: (city) => `Групи у місті ${city} — приєднуйся до спільноти`,
    description: (city) => `Групи та спільноти у ${city}: мовні обміни, спорт, настільні ігри, IT-мітапи та багато іншого. Приєднуйся або створи свою групу.`,
  },
  cs: {
    title: (city) => `Skupiny v ${city} — přidej se ke komunitě`,
    description: (city) => `Skupiny a komunity v ${city}: jazykové výměny, sport, deskové hry, tech meetupy a další. Přidej se ke skupině nebo si vytvoř vlastní.`,
  },
  de: {
    title: (city) => `Gruppen in ${city} — tritt einer Community bei`,
    description: (city) => `Gruppen und Communities in ${city}: Sprachtandems, Sport, Brettspiele, Tech-Meetups und mehr. Tritt einer Gruppe bei oder erstelle deine eigene.`,
  },
  es: {
    title: (city) => `Grupos en ${city} — únete a una comunidad`,
    description: (city) => `Grupos y comunidades en ${city}: intercambios de idiomas, deportes, juegos de mesa, meetups tech y más. Únete a un grupo o crea el tuyo.`,
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
    return { title: 'Groups' };
  }

  const cityLabel = matched.labels[locale] || matched.labels.en;
  const template = SEO_TEMPLATES[locale] || SEO_TEMPLATES.en;

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${city.toLowerCase().replace(/\s+/g, '-')}/groups`,
    title: template.title(cityLabel),
    description: template.description(cityLabel),
  });
}

export default async function CityGroupsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // This page should never render — the rewrite in next.config.ts
  // serves /groups?city=:city instead. If you see this, the rewrite
  // may not be active (restart the dev server).
  return <div />;
}
