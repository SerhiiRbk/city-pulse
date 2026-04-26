import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/actions/auth';
import { getProfileCreatedEvents } from '@/lib/actions/profile-data';
import { getUserEventStatuses } from '@/lib/actions/events';
import { MyEventCard } from '@/components/events/my-event-card';
import { CalendarSubscribeCard } from '@/components/events/calendar-subscribe-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ensureCalendarToken } from '@/lib/actions/calendar-token';
import { SITE_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  ListChecks,
  Sparkles,
  Users,
} from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tMy = await getTranslations({ locale, namespace: 'events.myEvents' });

  return buildPageMetadata({
    locale,
    path: '/events/my',
    title: tMy('title'),
    description: tMy('subtitle'),
    // Personal organizer dashboard — keep out of search engines.
    robots: { index: false, follow: false },
  });
}

type ProfileEvent = Awaited<ReturnType<typeof getProfileCreatedEvents>>[number];

const endsAtMs = (e: ProfileEvent) =>
  e.ends_at
    ? new Date(e.ends_at).getTime()
    : new Date(e.starts_at).getTime() + (e.duration_minutes ?? 60) * 60_000;

export default async function MyEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const tMy = await getTranslations('events.myEvents');

  const [events, calendarToken] = await Promise.all([
    getProfileCreatedEvents(user.id),
    ensureCalendarToken(),
  ]);

  // Bucket: drafts go in their own section. Live/past split uses ends_at so
  // currently in-progress events stay in the upcoming bucket.
  const now = Date.now();
  const drafts = events
    .filter((e) => e.status === 'draft')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const upcoming = events
    .filter((e) => e.status !== 'draft' && endsAtMs(e) >= now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  const past = events
    .filter((e) => e.status !== 'draft' && endsAtMs(e) < now)
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );

  const eventIds = events.map((e) => e.id);
  const { goingSet, waitlistSet, interestedSet, favoritedSet } =
    await getUserEventStatuses(eventIds);

  const isOrganizer = (e: ProfileEvent) => e.organizer_id === user.id;

  // Hero stats — small mental anchor for the user.
  const liveUpcoming = upcoming.filter((e) => e.status === 'published').length;
  const totalRsvps = upcoming
    .filter((e) => e.status === 'published')
    .reduce((sum, e) => sum + (e.going_count ?? 0), 0);
  const draftsCount = drafts.length;

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_30%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"
        />

        <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20 sm:pb-20 md:pt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4" />
                {tMy('heroBadge')}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {tMy('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg">
                {tMy('subtitle')}
              </p>

              {events.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-2">
                  <HeroStat
                    icon={<ListChecks className="h-4 w-4" />}
                    label={tMy('stats.upcoming')}
                    value={liveUpcoming}
                  />
                  <HeroStat
                    icon={<Users className="h-4 w-4" />}
                    label={tMy('stats.rsvps')}
                    value={totalRsvps}
                  />
                  <HeroStat
                    icon={<FileText className="h-4 w-4" />}
                    label={tMy('stats.drafts')}
                    value={draftsCount}
                  />
                  <HeroStat
                    icon={<CalendarPlus className="h-4 w-4" />}
                    label={tMy('stats.past')}
                    value={past.length}
                  />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/15 bg-white/10 text-white/90 backdrop-blur hover:bg-white/20 hover:text-white"
                >
                  <Link href="/events" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {tMy('backToEvents')}
                  </Link>
                </Button>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="shrink-0 self-start rounded-full px-6 shadow-xl"
            >
              <Link href="/events/create" className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5" />
                {tMy('createCta')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {events.length === 0 ? (
          <EmptyState
            icon="events"
            title={tMy('emptyTitle')}
            description={tMy('emptyDescription')}
          >
            <Button asChild>
              <Link href="/events/create" className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                {tMy('createCta')}
              </Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="space-y-14">
            {drafts.length > 0 && (
              <Section
                label={tMy('draftsLabel')}
                title={tMy('draftsTitle', { count: drafts.length })}
                tone="warning"
                description={tMy('draftsDescription')}
              >
                <Grid>
                  {drafts.map((event) => (
                    <MyEventCard
                      key={event.id}
                      event={event}
                      isPast={false}
                      isOrganizer={isOrganizer(event)}
                      isGoing={goingSet.has(event.id)}
                      isWaitlisted={waitlistSet.has(event.id)}
                      isInterested={interestedSet.has(event.id)}
                      isFavorited={favoritedSet.has(event.id)}
                    />
                  ))}
                </Grid>
              </Section>
            )}

            <Section
              label={tMy('upcomingLabel')}
              title={tMy('upcomingTitle', { count: upcoming.length })}
              tone="primary"
            >
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  {tMy('noUpcoming')}
                </div>
              ) : (
                <Grid>
                  {upcoming.map((event) => (
                    <MyEventCard
                      key={event.id}
                      event={event}
                      isPast={false}
                      isOrganizer={isOrganizer(event)}
                      isGoing={goingSet.has(event.id)}
                      isWaitlisted={waitlistSet.has(event.id)}
                      isInterested={interestedSet.has(event.id)}
                      isFavorited={favoritedSet.has(event.id)}
                    />
                  ))}
                </Grid>
              )}
            </Section>

            {past.length > 0 && (
              <Section
                label={tMy('pastLabel')}
                title={tMy('pastTitle', { count: past.length })}
                tone="muted"
                icon={<ListChecks className="h-4 w-4" />}
              >
                <div className="opacity-90">
                  <Grid>
                    {past.map((event) => (
                      <MyEventCard
                        key={event.id}
                        event={event}
                        isPast
                        isOrganizer={isOrganizer(event)}
                        isGoing={goingSet.has(event.id)}
                        isWaitlisted={waitlistSet.has(event.id)}
                        isInterested={interestedSet.has(event.id)}
                        isFavorited={favoritedSet.has(event.id)}
                      />
                    ))}
                  </Grid>
                </div>
              </Section>
            )}

            {calendarToken && (
              <CalendarSubscribeCard
                initialToken={calendarToken}
                origin={SITE_URL}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white/90 backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-xs uppercase tracking-wider text-white/65">
          {label}
        </span>
        <span className="text-base font-semibold text-white">{value}</span>
      </span>
    </div>
  );
}

function Section({
  label,
  title,
  description,
  icon,
  tone,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone: 'primary' | 'muted' | 'warning';
  children: React.ReactNode;
}) {
  const labelClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p
            className={`text-sm font-semibold uppercase tracking-[0.18em] ${labelClass}`}
          >
            <span className="inline-flex items-center gap-2">
              {icon}
              {label}
            </span>
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
