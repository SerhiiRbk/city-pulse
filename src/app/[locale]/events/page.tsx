import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEvents, getUserEventStatuses } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { EventsFilters } from '@/components/events/events-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarPlus, List, Map as MapIcon, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
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

  const categoryIds = filters.category
    ? filters.category.split(',').filter(Boolean)
    : [];
  const languageCodes = filters.language
    ? filters.language.split(',').filter(Boolean)
    : [];

  // Build map link that preserves the handful of filters relevant to the map
  // view (category + free-only). Date range is not forwarded because the map
  // uses coarse presets (today/weekend/etc) rather than arbitrary dates.
  const mapHref = (() => {
    const qs = new URLSearchParams();
    if (categoryIds.length > 0) qs.set('category', categoryIds.join(','));
    if (filters.is_free === 'true') qs.set('is_free', 'true');
    const query = qs.toString();
    return query ? `/events/map?${query}` : '/events/map';
  })();

  const events = await getEvents({
    country: filters.country,
    city_id: filters.city_id,
    city: filters.city,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : filters.is_online === 'false' ? false : undefined,
    limit: 24,
  });

  const { goingSet, waitlistSet, interestedSet, favoritedSet } = user
    ? await getUserEventStatuses(events.map((e) => e.id))
    : {
        goingSet: new Set<string>(),
        waitlistSet: new Set<string>(),
        interestedSet: new Set<string>(),
        favoritedSet: new Set<string>(),
      };

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
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
              <Button
                asChild
                size="lg"
                className="shrink-0 self-start rounded-full px-6 shadow-xl"
              >
                <Link href="/events/create" className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />
                  {tPage('createCta')}
                </Link>
              </Button>
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
              currentFilters={filters}
            />
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{tPage('sectionLabel')}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              {events.length > 0 ? tPage('resultsTitle', { count: events.length }) : tPage('noResultsTitle')}
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {tPage('sectionBody')}
          </p>
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isGoing={goingSet.has(event.id)}
                isWaitlisted={waitlistSet.has(event.id)}
                isInterested={interestedSet.has(event.id)}
                isFavorited={favoritedSet.has(event.id)}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
