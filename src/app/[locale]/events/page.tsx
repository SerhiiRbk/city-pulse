import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEvents } from '@/lib/actions/events';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { EventCard } from '@/components/events/event-card';
import { EventsFilters } from '@/components/events/events-filters';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {user && (
          <Button asChild>
            <Link href="/events/create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          </Button>
        )}
      </div>

      <EventsFilters interests={interests} categories={interestCategories} currentFilters={filters} />

      {events.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-lg">{t('noEvents')}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isAuthenticated={!!user}
            />
          ))}
        </div>
      )}
    </div>
  );
}
