import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSystemEvents } from '@/lib/actions/system-events';
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Landmark className="text-primary h-7 w-7" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {events.length === 0 ? (
        <div className="py-20 text-center">
          <Landmark className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-lg">No city events yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="relative">
              <Badge className="absolute top-2 right-2 z-10 bg-amber-500 text-white">
                {t('systemBadge')}
              </Badge>
              <EventCard event={event} isAuthenticated={!!user} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
