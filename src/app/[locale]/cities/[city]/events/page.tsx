import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getEvents, getUserEventStatuses, getAttendeeAvatarsBulk } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser, getUserProfile } from '@/lib/actions/auth';
import { getFriendsGoingBulk } from '@/lib/actions/friends-going';
import { getPublicCrewCountsBulk } from '@/lib/actions/crew';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { resolveEventTitle, resolveEventDescription } from '@/lib/event-i18n';
import { EventsGridWithLoadMore } from '@/components/events/events-grid-with-load-more';
import { EventsFilters } from '@/components/events/events-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  CalendarCheck, CalendarPlus, List, Map as MapIcon, Sparkles,
} from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { HeroImage } from '@/components/ui/hero-image';
import { locales, type Locale } from '@/i18n/config';
import { SUPPORTED_CITIES, findSupportedCity } from '@/lib/cities';
import type { EventSort } from '@/lib/actions/events';
import type { LoadMoreFilters } from '@/lib/actions/events-load-more';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string; city: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const SEO_TITLES: Record<string, (c: string) => string> = {
  en: (c) => `Events in ${c} — find people to go with`,
  ru: (c) => `Мероприятия в городе ${c} — найди компанию`,
  uk: (c) => `Заходи у місті ${c} — знайди компанію`,
  cs: (c) => `Akce v ${c} — najdi partu`,
  de: (c) => `Veranstaltungen in ${c} — finde eine Crew`,
  es: (c) => `Eventos en ${c} — encuentra tu crew`,
};

const SEO_DESCS: Record<string, (c: string) => string> = {
  en: (c) => `Discover events in ${c}: concerts, exhibitions, language exchanges, walks, board games, and more. Join a small crew or create your own.`,
  ru: (c) => `Мероприятия в ${c}: концерты, выставки, языковые обмены, прогулки, настольные игры и многое другое. Присоединяйся к компании или создай свою.`,
  uk: (c) => `Заходи у ${c}: концерти, виставки, мовні обміни, прогулянки, настільні ігри та багато іншого. Приєднуйся до компанії або створи свою.`,
  cs: (c) => `Akce v ${c}: koncerty, výstavy, jazykové výměny, procházky, deskové hry a další. Přidej se k partě nebo si vytvoř vlastní.`,
  de: (c) => `Veranstaltungen in ${c}: Konzerte, Ausstellungen, Sprachtandems, Spaziergänge, Brettspiele und mehr. Schließ dich einer Crew an oder erstelle deine eigene.`,
  es: (c) => `Eventos en ${c}: conciertos, exposiciones, intercambios de idiomas, paseos, juegos de mesa y más. Únete a un crew o crea el tuyo.`,
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
  if (!matched) {
    const t = await getTranslations({ locale, namespace: 'events' });
    return { title: t('title') };
  }
  const cityLabel = matched.labels[locale] || matched.labels.en;
  const citySlug = matched.slug.toLowerCase().replace(/\s+/g, '-');
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${citySlug}/events`,
    title: (SEO_TITLES[locale] || SEO_TITLES.en)(cityLabel),
    description: (SEO_DESCS[locale] || SEO_DESCS.en)(cityLabel),
  });
}

export default async function CityEventsPage({ params, searchParams }: Props) {
  const { locale, city } = await params;
  setRequestLocale(locale);

  const matched = findSupportedCity(city);
  if (!matched) notFound();

  const filters = await searchParams;
  const t = await getTranslations('events');
  const tPage = await getTranslations('events.page');
  const tMap = await getTranslations('events.map');
  const user = await getUser();
  const [interests, interestCategories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  const cityLabel = matched.labels[locale] || matched.labels.en;
  const citySlug = matched.slug.toLowerCase().replace(/\s+/g, '-');

  const categorySlugs = filters.category ? filters.category.split(',').filter(Boolean) : [];
  const categoryIds = categorySlugs
    .map((slug) => interests.find((i) => i.slug === slug)?.id)
    .filter((id): id is string => !!id);
  const languageCodes = filters.language ? filters.language.split(',').filter(Boolean) : [];
  const safetyTags = filters.safety ? filters.safety.split(',').filter(Boolean) : [];

  const sort: EventSort = filters.sort === 'popular' ? 'popular' : 'soon';
  const includePast = filters.include_past === 'true';
  const sourceFilter: 'all' | 'community' | 'afisha' =
    filters.source === 'community' || filters.source === 'afisha' ? filters.source : 'all';
  const isSystemFilter = sourceFilter === 'community' ? false : sourceFilter === 'afisha' ? true : undefined;

  const events = await getEvents({
    city: matched.dbName,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : undefined,
    is_system: isSystemFilter,
    q: filters.q,
    safety_tags: safetyTags.length > 0 ? safetyTags : undefined,
    limit: 24,
    sort,
    include_past: includePast,
  });

  const { goingSet, waitlistSet, interestedSet, favoritedSet } = user
    ? await getUserEventStatuses(events.map((e) => e.id))
    : { goingSet: new Set<string>(), waitlistSet: new Set<string>(), interestedSet: new Set<string>(), favoritedSet: new Set<string>() };

  const friendsGoingByEvent = user && (await isFeatureEnabled('friends_going', user.id))
    ? await getFriendsGoingBulk(events.map((e) => e.id))
    : {};

  const crewCounts = await getPublicCrewCountsBulk(events.map((e) => e.id));
  const attendeeAvatars = await getAttendeeAvatarsBulk(events.map((e) => e.id));

  const userProfile = user ? await getUserProfile() : null;
  const userInterestIds = new Set(userProfile?.interests || []);

  const loadMoreFilters: LoadMoreFilters = {
    city: matched.dbName,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : undefined,
    is_system: isSystemFilter,
    q: filters.q,
    safety_tags: safetyTags.length > 0 ? safetyTags : undefined,
    sort,
    include_past: includePast,
  };

  return (
    <div>
      {/* Hero — same as /events */}
      <section className="relative overflow-hidden bg-slate-950">
        <HeroImage src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_30%)]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-24 sm:pt-20 sm:pb-32 md:pt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4" />
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

              <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur">
                <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-900 shadow-sm">
                  <span className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    {tMap('viewList')}
                  </span>
                </span>
                <Button asChild variant="ghost" size="sm" className="rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                  <Link href="/events/map" className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4" />
                    {tMap('viewMap')}
                  </Link>
                </Button>
              </div>
            </div>

            {user && (
              <div className="flex shrink-0 flex-wrap gap-2 self-start sm:flex-col sm:items-stretch">
                <Button asChild size="lg" className="rounded-full px-6 shadow-xl">
                  <Link href="/events/create" className="flex items-center gap-2">
                    <CalendarPlus className="h-5 w-5" />
                    {tPage('createCta')}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-full border border-white/15 bg-white/10 px-6 text-white/90 backdrop-blur hover:bg-white/20 hover:text-white">
                  <Link href="/events/my" className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    {tPage('myEventsCta')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Floating filter bar */}
      <div className="relative z-20 -mt-16 sm:-mt-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/95 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 sm:p-4">
            <EventsFilters
              interests={interests}
              categories={interestCategories}
              hideCity
              basePath={`/cities/${citySlug}/events`}
              currentFilters={{
                ...filters,
                city: matched.dbName,
              }}
            />
          </div>
        </div>
      </div>

      {/* Events grid */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
      {events.length === 0 ? (
        <EmptyState icon="events" title={t('noEvents')} description={tPage('emptyDescription')}>
          {user && (
            <Button asChild>
              <Link href="/events/create" className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                {tPage('createCta')}
              </Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <EventsGridWithLoadMore
          initialEvents={events.map((e) => ({
            ...e,
            title: resolveEventTitle(e, locale),
            description: resolveEventDescription(e, locale) ?? e.description,
            public_crew_count: crewCounts[e.id] ?? 0,
            attendee_avatars: attendeeAvatars[e.id] ?? [],
            matches_interests: e.category_id ? userInterestIds.has(e.category_id) : false,
          }))}
          initialGoingSet={Array.from(goingSet)}
          initialWaitlistSet={Array.from(waitlistSet)}
          initialInterestedSet={Array.from(interestedSet)}
          initialFavoritedSet={Array.from(favoritedSet)}
          initialFriendsGoing={friendsGoingByEvent}
          isAuthenticated={!!user}
          filters={loadMoreFilters}
          pageSize={24}
          showCount
        />
      )}

      {/* Cross-link to city groups */}
      <div className="mt-10 rounded-2xl border border-border/50 bg-muted/30 p-5 text-center">
        <Link
          href={`/cities/${citySlug}/groups`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {tPage('cityGroupsLink', { city: cityLabel })}
        </Link>
      </div>
      </section>
    </div>
  );
}
