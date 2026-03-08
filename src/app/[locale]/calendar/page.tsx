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
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t('title')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('subtitle')}
        </p>
      </div>
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
