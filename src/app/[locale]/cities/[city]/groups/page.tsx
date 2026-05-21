import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getGroups } from '@/lib/actions/groups';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { GroupCard } from '@/components/groups/group-card';
import { GroupsFilters } from '@/components/groups/groups-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { HeroImage } from '@/components/ui/hero-image';
import { locales, type Locale } from '@/i18n/config';
import { SUPPORTED_CITIES, findSupportedCity } from '@/lib/cities';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string; city: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const SEO_TITLES: Record<string, (c: string) => string> = {
  en: (c) => `Groups in ${c} — join a community`,
  ru: (c) => `Группы в городе ${c} — присоединяйся к сообществу`,
  uk: (c) => `Групи у місті ${c} — приєднуйся до спільноти`,
  cs: (c) => `Skupiny v ${c} — přidej se ke komunitě`,
  de: (c) => `Gruppen in ${c} — tritt einer Community bei`,
  es: (c) => `Grupos en ${c} — únete a una comunidad`,
};

const SEO_DESCS: Record<string, (c: string) => string> = {
  en: (c) => `Find communities and groups in ${c}: language exchanges, sports, board games, tech meetups, and more. Join a group or create your own.`,
  ru: (c) => `Группы и сообщества в ${c}: языковые обмены, спорт, настольные игры, IT-митапы и многое другое. Присоединяйся или создай свою группу.`,
  uk: (c) => `Групи та спільноти у ${c}: мовні обміни, спорт, настільні ігри, IT-мітапи та багато іншого. Приєднуйся або створи свою групу.`,
  cs: (c) => `Skupiny a komunity v ${c}: jazykové výměny, sport, deskové hry, tech meetupy a další. Přidej se ke skupině nebo si vytvoř vlastní.`,
  de: (c) => `Gruppen und Communities in ${c}: Sprachtandems, Sport, Brettspiele, Tech-Meetups und mehr. Tritt einer Gruppe bei oder erstelle deine eigene.`,
  es: (c) => `Grupos y comunidades en ${c}: intercambios de idiomas, deportes, juegos de mesa, meetups tech y más. Únete a un grupo o crea el tuyo.`,
};

export async function generateStaticParams() {
  const params: { locale: string; city: string }[] = [];
  for (const locale of locales) {
    for (const city of SUPPORTED_CITIES) {
      params.push({ locale, city: city.slug.toLowerCase().replace(/\s+/g, '-') });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params;
  const matched = findSupportedCity(city);
  if (!matched) return { title: 'Groups' };
  const cityLabel = matched.labels[locale] || matched.labels.en;
  const citySlug = matched.slug.toLowerCase().replace(/\s+/g, '-');
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${citySlug}/groups`,
    title: (SEO_TITLES[locale] || SEO_TITLES.en)(cityLabel),
    description: (SEO_DESCS[locale] || SEO_DESCS.en)(cityLabel),
    image: matched.image,
    imageAlt: `${cityLabel} — groups and communities`,
  });
}

export default async function CityGroupsPage({ params, searchParams }: Props) {
  const { locale, city } = await params;
  setRequestLocale(locale);

  const matched = findSupportedCity(city);
  if (!matched) notFound();

  const filters = await searchParams;
  const t = await getTranslations('groups');
  const tPage = await getTranslations('groups.page');
  const user = await getUser();
  const [interests, interestCategories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  const cityLabel = matched.labels[locale] || matched.labels.en;
  const citySlug = matched.slug.toLowerCase().replace(/\s+/g, '-');

  const interestIds = filters.interest ? filters.interest.split(',').filter(Boolean) : [];
  const languageCodes = filters.language ? filters.language.split(',').filter(Boolean) : [];

  const groups = await getGroups({
    city: matched.dbName,
    interests: interestIds.length > 0 ? interestIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    q: filters.q,
    limit: 24,
  });

  return (
    <div>
      {/* Hero — same style as /groups */}
      <section className="relative overflow-hidden bg-slate-950">
        <HeroImage src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20 sm:pb-20 md:pt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4 text-amber-300" />
                {cityLabel}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {(SEO_TITLES[locale] || SEO_TITLES.en)(cityLabel)}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg">
                {tPage('subtitle')}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {[tPage('trust1'), tPage('trust2'), tPage('trust3')].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur sm:text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {user && (
              <Button asChild size="lg" className="shrink-0 self-start rounded-full px-6 shadow-xl">
                <Link href="/groups/create" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('create')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Floating filter bar */}
      <div className="relative z-20 -mt-10 sm:-mt-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/95 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 sm:p-4">
            <GroupsFilters
              interests={interests}
              categories={interestCategories}
              hideCity
              basePath={`/cities/${citySlug}/groups`}
              currentFilters={{
                ...filters,
                city: matched.dbName,
              }}
            />
          </div>
        </div>
      </div>

      {/* Groups grid */}
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{tPage('sectionLabel')}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              {groups.length > 0 ? tPage('resultsTitle', { count: groups.length }) : tPage('noResultsTitle')}
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {tPage('sectionBody')}
          </p>
        </div>
        {groups.length === 0 ? (
          <EmptyState icon="groups" title={t('noGroups')} description={tPage('emptyDescription')}>
            {user && (
              <Button asChild>
                <Link href="/groups/create" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('create')}
                </Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}

        {/* Cross-link to city events */}
        <div className="mt-10 rounded-2xl border border-border/50 bg-muted/30 p-5 text-center">
          <Link
            href={`/cities/${citySlug}/events`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {(SEO_TITLES.en === SEO_TITLES[locale] ? `Events in ${cityLabel}` : (SEO_TITLES[locale] || SEO_TITLES.en)(cityLabel).replace(/—.*/, '').trim())}
          </Link>
        </div>
      </div>
    </div>
  );
}
