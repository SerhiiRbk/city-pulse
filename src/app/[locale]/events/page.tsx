import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEvents, getUserEventStatuses } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { EventsFilters } from '@/components/events/events-filters';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarPlus } from 'lucide-react';

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
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />

        <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
          <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 text-xl text-white/80 drop-shadow">
                Discover events near you
              </p>
            </div>
            {user && (
              <Button asChild size="lg" className="rounded-full px-6 shadow-xl transition-transform hover:scale-105">
                <Link href="/events/create" className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />
                  Create event
                </Link>
              </Button>
            )}
          </div>

          {/* Filter bar */}
          <div className="rounded-2xl bg-white/10 p-2 backdrop-blur-md">
            <EventsFilters
              interests={interests}
              categories={interestCategories}
              currentFilters={filters}
            />
          </div>
        </div>
      </section>

      {/* Events grid */}
      <section className="container mx-auto px-4 py-12">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <CalendarPlus className="text-muted-foreground h-10 w-10" />
            </div>
            <p className="text-muted-foreground mb-1 text-lg font-medium">{t('noEvents')}</p>
            <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
          </div>
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
