import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEvents, getUserEventStatuses, getAttendeeAvatarsBulk } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser, getUserProfile } from '@/lib/actions/auth';
import { getFriendsGoingBulk } from '@/lib/actions/friends-going';
import { getPublicCrewCountsBulk } from '@/lib/actions/crew';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { resolveEventTitle, resolveEventDescription } from '@/lib/event-i18n';
import { EventsGridWithLoadMore } from '@/components/events/events-grid-with-load-more';
import { EventsFilters } from '@/components/events/events-filters';
import { FilterPersistence } from '@/components/events/filter-persistence';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  ArrowDownUp,
  CalendarCheck,
  CalendarPlus,
  Eye,
  EyeOff,
  Flame,
  List,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { HeroImage } from '@/components/ui/hero-image';
import { resolveCityFilter } from '@/lib/resolve-city-filter';
import { findSupportedCity } from '@/lib/cities';
import type { EventSort } from '@/lib/actions/events';
import type { LoadMoreFilters } from '@/lib/actions/events-load-more';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, tPage] = await Promise.all([
    getTranslations({ locale, namespace: 'events' }),
    getTranslations({ locale, namespace: 'events.page' }),
  ]);

  return buildPageMetadata({
    locale,
    path: '/events',
    title: t('title'),
    description: tPage('subtitle'),
  });
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const t = await getTranslations('events');
  const tPage = await getTranslations('events.page');
  const tMap = await getTranslations('events.map');
  const user = await getUser();
  const [interests, interestCategories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  const categorySlugs = filters.category
    ? filters.category.split(',').filter(Boolean)
    : [];
  // Resolve slugs to UUIDs for the database query
  const categoryIds = categorySlugs
    .map((slug) => interests.find((i) => i.slug === slug)?.id)
    .filter((id): id is string => !!id);
  const languageCodes = filters.language
    ? filters.language.split(',').filter(Boolean)
    : [];
  const safetyTags = filters.safety
    ? filters.safety.split(',').filter(Boolean)
    : [];

  // Build map link that preserves the handful of filters relevant to the map
  // view (category + free-only). Date range is not forwarded because the map
  // uses coarse presets (today/weekend/etc) rather than arbitrary dates.
  const mapHref = (() => {
    const qs = new URLSearchParams();
    if (categorySlugs.length > 0) qs.set('category', categorySlugs.join(','));
    if (filters.is_free === 'true') qs.set('is_free', 'true');
    const query = qs.toString();
    return query ? `/events/map?${query}` : '/events/map';
  })();

  const allowedSorts = ['soon', 'popular'] as const;
  const sort: EventSort = (allowedSorts as readonly string[]).includes(filters.sort ?? '')
    ? (filters.sort as EventSort)
    : 'soon';
  const includePast = filters.include_past === 'true';
  // Tri-state filter for the editorial "Афиша" track. Default mixes both
  // system and community events so first-time visitors see the full feed.
  const sourceFilter: 'all' | 'community' | 'afisha' =
    filters.source === 'community' || filters.source === 'afisha'
      ? filters.source
      : 'all';
  const isSystemFilter =
    sourceFilter === 'community' ? false : sourceFilter === 'afisha' ? true : undefined;

  // --- City resolution (shared logic) ---
  // Determine if the city param is a supported city slug (from /cities/[city]/events rewrite)
  const cityFromSlug = filters.city ? findSupportedCity(filters.city) : undefined;

  const cityFilter = await resolveCityFilter({
    citySlug: cityFromSlug ? filters.city : undefined,
    cityParam: filters.city && !cityFromSlug ? filters.city : undefined,
    cityIdParam: filters.city_id,
    countryParam: filters.country,
    geoOff: filters.geo_off === '1',
    userId: user?.id,
  });

  const geoCityId = cityFilter.cityId;
  const geoCityName = cityFilter.cityName;
  const geoCountry = cityFilter.country;
  const detectedCity = cityFilter.detectedCity;

  const events = await getEvents({
    country: geoCountry,
    city_id: geoCityId,
    city: geoCityName,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : filters.is_online === 'false' ? false : undefined,
    is_system: isSystemFilter,
    q: filters.q,
    safety_tags: safetyTags.length > 0 ? safetyTags : undefined,
    limit: 24,
    sort,
    include_past: includePast,
  });

  // Build URLs that flip a single param while preserving everything else.
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...overrides })) {
      if (value === undefined || value === '') continue;
      qs.set(key, value as string);
    }
    const query = qs.toString();
    return query ? `/events?${query}` : '/events';
  };

  const { goingSet, waitlistSet, interestedSet, favoritedSet } = user
    ? await getUserEventStatuses(events.map((e) => e.id))
    : {
        goingSet: new Set<string>(),
        waitlistSet: new Set<string>(),
        interestedSet: new Set<string>(),
        favoritedSet: new Set<string>(),
      };

  // Friends-going lookup is gated by the `friends_going` flag so we
  // can roll it out city by city. Skip the bulk query for anonymous
  // viewers — they have no follow graph to compare against.
  const friendsGoingByEvent =
    user && (await isFeatureEnabled('friends_going', user.id))
      ? await getFriendsGoingBulk(events.map((e) => e.id))
      : {};

  // Crew counts for card indicators
  const crewCounts = await getPublicCrewCountsBulk(events.map((e) => e.id));

  // Attendee avatars for social proof on cards
  const attendeeAvatars = await getAttendeeAvatarsBulk(events.map((e) => e.id));

  // User interests for "matches your interests" indicator
  const userProfile = user ? await getUserProfile() : null;
  const userInterestIds = new Set(userProfile?.interests || []);

  // Filters object passed to the load-more component so it can fetch
  // subsequent pages with the same criteria.
  const loadMoreFilters: LoadMoreFilters = {
    country: geoCountry,
    city_id: geoCityId,
    city: geoCityName,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : filters.is_online === 'false' ? false : undefined,
    is_system: isSystemFilter,
    q: filters.q,
    safety_tags: safetyTags.length > 0 ? safetyTags : undefined,
    sort,
    include_past: includePast,
  };

  return (
    <div>
      <FilterPersistence />
      <section className="relative overflow-hidden bg-slate-950">
        <HeroImage src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_30%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"
        />

        <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-24 sm:pt-20 sm:pb-32 md:pt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4" />
                {tPage('heroBadge')}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {t('title')}
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
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <Link href={mapHref} className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4" />
                    {tMap('viewMap')}
                  </Link>
                </Button>
              </div>
            </div>

            {user && (
              <div className="flex shrink-0 flex-wrap gap-2 self-start sm:flex-col sm:items-stretch">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-6 shadow-xl"
                >
                  <Link href="/events/create" className="flex items-center gap-2">
                    <CalendarPlus className="h-5 w-5" />
                    {tPage('createCta')}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-full border border-white/15 bg-white/10 px-6 text-white/90 backdrop-blur hover:bg-white/20 hover:text-white"
                >
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

      {/* Floating filter bar that overlaps the hero — creates depth and lets the photo breathe */}
      <div className="relative z-20 -mt-16 sm:-mt-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/95 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 sm:p-4">
            <EventsFilters
              interests={interests}
              categories={interestCategories}
              initialCity={detectedCity ? { id: detectedCity.id, name: detectedCity.name, country: detectedCity.country, lat: 0, lng: 0, translations: {} } : null}
              isAutoDetected={cityFilter.isAutoDetected}
              currentFilters={{
                ...filters,
                city_id: geoCityId,
                city: geoCityName,
                country: geoCountry,
              }}
            />
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{tPage('sectionLabel')}</p>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {tPage('sectionBody')}
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-1">
            <span className="hidden items-center gap-1.5 px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
              <ArrowDownUp className="h-3 w-3" />
              {tPage('sort.label')}
            </span>
            {[
              { value: 'soon' as const, label: tPage('sort.soon'), Icon: Sparkles },
              { value: 'popular' as const, label: tPage('sort.popular'), Icon: Flame },
            ].map(({ value, label, Icon }) => {
              const isActive = sort === value;
              return (
                <Button
                  key={value}
                  asChild
                  size="sm"
                  variant={isActive ? 'default' : 'ghost'}
                  className="rounded-full px-3"
                >
                  <Link href={buildHref({ sort: value === 'soon' ? undefined : value })}>
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/*
             * Tri-state source filter — controls what tracks the listing
             * shows. Defaults to "all" so first-time visitors get a unified
             * feed; switching to "community" or "afisha" persists in the
             * URL like every other filter.
             */}
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-1">
              {(
                [
                  { value: 'all' as const, label: tPage('source.all') },
                  { value: 'community' as const, label: tPage('source.community') },
                  { value: 'afisha' as const, label: tPage('source.afisha') },
                ]
              ).map(({ value, label }) => {
                const isActive = sourceFilter === value;
                return (
                  <Button
                    key={value}
                    asChild
                    size="sm"
                    variant={isActive ? 'default' : 'ghost'}
                    className="rounded-full px-3"
                  >
                    <Link href={buildHref({ source: value === 'all' ? undefined : value })}>
                      {label}
                    </Link>
                  </Button>
                );
              })}
            </div>

            <Button
              asChild
              size="sm"
              variant={includePast ? 'secondary' : 'outline'}
              className="rounded-full"
            >
              <Link
                href={buildHref({ include_past: includePast ? undefined : 'true' })}
                className="flex items-center gap-1.5"
              >
                {includePast ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {includePast ? tPage('hidePast') : tPage('showPast')}
              </Link>
            </Button>
          </div>
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon="events"
            title={t('noEvents')}
            description={tPage('emptyDescription')}
          >
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
      </section>
    </div>
  );
}
