import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getUser } from '@/lib/actions/auth';
import { getCalendarEvents, getMyCalendarEvents } from '@/lib/actions/calendar';
import { ensureCalendarToken } from '@/lib/actions/calendar-token';
import { CalendarPageClient } from '@/components/calendar/calendar-page-client';
import { buildPageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'calendar' });

  return buildPageMetadata({
    locale,
    path: '/calendar',
    title: t('title'),
    description: t('subtitle'),
  });
}

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

  const [allEvents, myEvents, calendarToken] = await Promise.all([
    getCalendarEvents(year, month),
    user ? getMyCalendarEvents(year, month) : Promise.resolve([]),
    user ? ensureCalendarToken() : Promise.resolve(null),
  ]);

  // Compute today-context stats on the server so the hero stays useful
  // even before any client interactivity. The calendar view itself owns
  // navigation state and re-fetches per-month from the client.
  const todayKey = now.toDateString();
  const todayEventsCount = allEvents.filter(
    (e) => new Date(e.starts_at).toDateString() === todayKey,
  ).length;
  const myMonthCount = myEvents.length;
  const totalMonthCount = allEvents.length;

  const todayLabel = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {/* Editorial header — replaces the previous "Calendar / Calendar"
          duplicate. We lean into typography (display-size weekday + date)
          and a discreet stat strip so the page has a clear "today" anchor
          before users even start navigating months. */}
      <header className="mb-8 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {t('eyebrow')}
        </p>
        <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('subtitle')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm shadow-sm backdrop-blur sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/15" />
            <span className="font-medium capitalize">{todayLabel}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <HeroStat
            label={t('stats.thisMonth')}
            value={totalMonthCount.toString()}
            tone="primary"
          />
          <HeroStat
            label={t('stats.today')}
            value={todayEventsCount.toString()}
            tone="amber"
          />
          {user ? (
            <HeroStat
              label={t('stats.mine')}
              value={myMonthCount.toString()}
              tone="emerald"
            />
          ) : null}
        </div>
      </header>

      <CalendarPageClient
        initialEvents={allEvents}
        initialMyEvents={myEvents}
        initialYear={year}
        initialMonth={month}
        isAuthenticated={!!user}
        calendarToken={calendarToken}
        siteUrl={SITE_URL}
      />
    </div>
  );
}

/**
 * Compact stat pill used in the page header. Tones map to the existing
 * brand palette (primary/amber/emerald) rather than introducing new
 * colors — keeps the surface cohesive with the rest of the app.
 */
function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'amber' | 'emerald';
}) {
  const ringClass =
    tone === 'primary'
      ? 'ring-primary/20 bg-primary/5 text-primary'
      : tone === 'amber'
        ? 'ring-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300'
        : 'ring-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3 shadow-sm">
      <span
        className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 text-base font-semibold ring-1 ring-inset ${ringClass}`}
      >
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
