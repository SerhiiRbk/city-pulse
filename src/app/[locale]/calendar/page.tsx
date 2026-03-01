import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/actions/auth';
import { getCalendarEvents, getMyCalendarEvents } from '@/lib/actions/calendar';
import { CalendarPageClient } from '@/components/calendar/calendar-page-client';

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('calendar');
  const user = await getUser();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [allEvents, myEvents] = await Promise.all([
    getCalendarEvents(year, month),
    user ? getMyCalendarEvents(year, month) : Promise.resolve([]),
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <CalendarPageClient
        initialEvents={allEvents}
        initialMyEvents={myEvents}
        initialYear={year}
        initialMonth={month}
        isAuthenticated={!!user}
      />
    </div>
  );
}
