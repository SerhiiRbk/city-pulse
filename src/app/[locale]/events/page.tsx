import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEvents, getUserEventStatuses } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { EventsFilters } from '@/components/events/events-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarPlus, Sparkles, UsersRound, Languages } from 'lucide-react';
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
  const user = await getUser();
  const [interests, interestCategories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  const categoryIds = filters.category
    ? filters.category.split(',').filter(Boolean)
    : [];

  const events = await getEvents({
    country: filters.country,
    city_id: filters.city_id,
    city: filters.city,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    date_from: filters.date_from,
    date_to: filters.date_to,
    is_free: filters.is_free === 'true' ? true : filters.is_free === 'false' ? false : undefined,
    is_online: filters.is_online === 'true' ? true : filters.is_online === 'false' ? false : undefined,
    limit: 24,
  });

  const { goingSet, favoritedSet } = user
    ? await getUserEventStatuses(events.map((e) => e.id))
    : { goingSet: new Set<string>(), favoritedSet: new Set<string>() };

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto px-4 pt-14 pb-10 sm:pt-16 sm:pb-12 md:pt-24 md:pb-18">
          <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:mb-4 sm:text-sm">
                <Sparkles className="h-4 w-4" />
                {tPage('heroBadge')}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg md:text-xl">
                {tPage('subtitle')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  tPage('trust1'),
                  tPage('trust2'),
                  tPage('trust3'),
                ].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur-sm sm:text-sm">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {user && (
                  <Button asChild size="lg" className="rounded-full px-6 shadow-xl">
                    <Link href="/events/create" className="flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5" />
                      {tPage('createCta')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md lg:block">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">{tPage('sideLabel')}</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: UsersRound, title: tPage('sideItem1Title'), body: tPage('sideItem1Body') },
                    { icon: Languages, title: tPage('sideItem2Title'), body: tPage('sideItem2Body') },
                    { icon: Sparkles, title: tPage('sideItem3Title'), body: tPage('sideItem3Body') },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold">{title}</p>
                          <p className="mt-1 text-sm text-white/65">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-7 max-w-5xl rounded-[1.9rem] border border-border/70 bg-background/92 p-3 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:mt-8 sm:p-4">
            <EventsFilters
              interests={interests}
              categories={interestCategories}
              currentFilters={filters}
            />
          </div>
        </div>
      </section>

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
