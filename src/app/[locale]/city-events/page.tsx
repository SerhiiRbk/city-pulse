import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getSystemEvents } from '@/lib/actions/system-events';
import { getUserEventStatuses } from '@/lib/actions/events';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Landmark, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';

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
  searchParams: Promise<{ city?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const t = await getTranslations('cityEvents');
  const user = await getUser();
  const events = await getSystemEvents({ city: filters.city, limit: 24 });

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
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto px-4 pt-14 pb-10 sm:pt-16 sm:pb-12 md:pt-20 md:pb-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white backdrop-blur-md sm:mb-4">
                <Landmark className="h-4 w-4" />
                <span className="text-xs font-medium sm:text-sm">{t('officialBadge')}</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg md:text-xl">
                {t('subtitle')}
              </p>
            </div>
            <div className="hidden rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md lg:block">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 text-white">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{t('resultsDescription')}</p>
                    <p className="mt-1 text-sm text-white/65">
                      {filters.city ? filters.city : t('subtitle')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t('officialBadge')}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">{t('resultsTitle', { count: events.length })}</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">{t('resultsDescription')}</p>
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon="events"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <Badge className="absolute top-2 right-2 z-10 bg-amber-500 text-white shadow-md">
                  {t('systemBadge')}
                </Badge>
                <EventCard event={event} isGoing={goingSet.has(event.id)} isWaitlisted={waitlistSet.has(event.id)} isInterested={interestedSet.has(event.id)} isFavorited={favoritedSet.has(event.id)} isAuthenticated={!!user} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
