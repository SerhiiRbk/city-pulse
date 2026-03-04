import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSystemEvents } from '@/lib/actions/system-events';
import { getUserEventStatuses } from '@/lib/actions/events';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { Badge } from '@/components/ui/badge';
import { Landmark } from 'lucide-react';

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

  const { goingSet, favoritedSet } = user
    ? await getUserEventStatuses(events.map((e) => e.id))
    : { goingSet: new Set<string>(), favoritedSet: new Set<string>() };

  return (
    <div>
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1449844908441-8829872d2607?w=2000&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-background" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
          <div className="mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-white backdrop-blur-md">
              <Landmark className="h-4 w-4" />
              <span className="text-sm font-medium">Official Events</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-3 text-xl text-white/80 drop-shadow">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <Landmark className="text-muted-foreground h-10 w-10" />
            </div>
            <p className="text-muted-foreground mb-1 text-lg font-medium">No city events yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <Badge className="absolute top-2 right-2 z-10 bg-amber-500 text-white shadow-md">
                  {t('systemBadge')}
                </Badge>
                <EventCard event={event} isGoing={goingSet.has(event.id)} isFavorited={favoritedSet.has(event.id)} isAuthenticated={!!user} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
