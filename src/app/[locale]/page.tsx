import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, MapPin, Users, CalendarDays, Heart, Globe, Shield,
  CalendarPlus, UserPlus, Bell, UsersRound,
} from 'lucide-react';
import { getUser } from '@/lib/actions/auth';
import { getTodayEvents, getTomorrowEvents, getWeekendEvents, getPopularEvents, getTopGroups } from '@/lib/actions/landing';
import { getUserEventStatuses } from '@/lib/actions/events';
import { EventCard } from '@/components/events/event-card';
import { GroupCard } from '@/components/groups/group-card';
import { generateOrganizationJsonLd } from '@/lib/json-ld';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tNav = await getTranslations('nav');
  const user = await getUser();

  const [todayEvents, tomorrowEvents, weekendEvents, popularEvents, topGroups] = await Promise.all([
    getTodayEvents(6),
    getTomorrowEvents(6),
    getWeekendEvents(6),
    getPopularEvents(6),
    getTopGroups(4),
  ]);

  const allEventIds = [...todayEvents, ...tomorrowEvents, ...weekendEvents, ...popularEvents].map((e) => e.id);
  const { goingSet, favoritedSet } = user
    ? await getUserEventStatuses(allEventIds)
    : { goingSet: new Set<string>(), favoritedSet: new Set<string>() };

  const featureCards = [
    { icon: MapPin, title: t('features.localEvents'), desc: t('features.localEventsDesc') },
    { icon: Users, title: t('features.communities'), desc: t('features.communitiesDesc') },
    { icon: CalendarDays, title: t('features.calendar'), desc: t('features.calendarDesc') },
    { icon: Heart, title: t('features.connections'), desc: t('features.connectionsDesc') },
    { icon: Globe, title: t('features.multilingual'), desc: t('features.multilingualDesc') },
    { icon: Shield, title: t('features.safety'), desc: t('features.safetyDesc') },
  ];

  const orgJsonLd = generateOrganizationJsonLd();

  const howItWorks = [
    { step: '01', icon: CalendarPlus, title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
    { step: '02', icon: Globe, title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
    { step: '03', icon: Bell, title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
    { step: '04', icon: UsersRound, title: t('howItWorks.step4Title'), desc: t('howItWorks.step4Desc') },
  ];

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Hero with city image */}
      <section className="relative overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />

        <div className="relative z-10 container mx-auto px-4 pt-24 pb-20 md:pt-36 md:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-5 border-white/20 bg-white/10 text-white backdrop-blur-sm">
              <Globe className="mr-1.5 h-3 w-3" />
              Prague &middot; Berlin &middot; Barcelona &middot; Tel Aviv
            </Badge>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mb-10 text-lg text-white/70 md:text-xl">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="outline" asChild className="h-12 border-white/40 bg-white/10 px-8 text-base text-white shadow-lg backdrop-blur-sm hover:bg-white/20 hover:text-white">
                <Link href="/events" className="flex items-center gap-2">
                  {t('hero.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" asChild className="h-12 border-white/40 bg-white/10 px-8 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white">
                  <Link href="/register">{tNav('register')}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">Why City-Pulse?</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">Everything you need to connect with your city and its people.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="group border-border/50 bg-background/50 rounded-3xl shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="bg-primary/10 mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-colors group-hover:bg-primary/20">
                  <Icon className="text-primary h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Decorative divider */}
      <div className="container mx-auto px-4">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="pt-12">
          <EventSection
            title={t('sections.todayEvents')}
            events={todayEvents}
            isAuthenticated={!!user}
            viewAllLabel={t('sections.viewAllEvents')}
            goingSet={goingSet}
            favoritedSet={favoritedSet}
          />
        </div>
      )}

      {/* Tomorrow's Events */}
      {tomorrowEvents.length > 0 && (
        <EventSection
          title={t('sections.tomorrowEvents')}
          events={tomorrowEvents}
          isAuthenticated={!!user}
          viewAllLabel={t('sections.viewAllEvents')}
          goingSet={goingSet}
          favoritedSet={favoritedSet}
          alt
        />
      )}

      {/* Weekend Events */}
      {weekendEvents.length > 0 && (
        <EventSection
          title={t('sections.weekendEvents')}
          events={weekendEvents}
          isAuthenticated={!!user}
          viewAllLabel={t('sections.viewAllEvents')}
          goingSet={goingSet}
          favoritedSet={favoritedSet}
        />
      )}

      {/* Popular Events (fallback) */}
      {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekendEvents.length === 0 && popularEvents.length > 0 && (
        <div className="pt-12">
          <EventSection
            title={t('sections.topEvents')}
            events={popularEvents}
            isAuthenticated={!!user}
            viewAllLabel={t('sections.viewAllEvents')}
            goingSet={goingSet}
            favoritedSet={favoritedSet}
          />
        </div>
      )}

      {/* Top Groups */}
      {topGroups.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('sections.topGroups')}</h2>
              <Button variant="ghost" className="group" asChild>
                <Link href="/groups" className="flex items-center gap-2">
                  {t('sections.viewAllGroups')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekendEvents.length === 0 && popularEvents.length === 0 && topGroups.length === 0 && (
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold">{t('sections.topEvents')}</h2>
            <p className="text-muted-foreground mb-6">{t('hero.subtitle')}</p>
            <Button asChild>
              <Link href="/events" className="flex items-center gap-2">
                {t('sections.viewAllEvents')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="bg-muted/30 border-t py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">{t('howItWorks.title')}</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {howItWorks.map(({ step, icon: Icon, title, desc }, i) => (
              <React.Fragment key={step}>
                <div className="bg-background group relative rounded-3xl border-border/50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <span className="text-primary/10 absolute right-6 top-6 text-5xl font-black transition-colors group-hover:text-primary/20">
                    {step}
                  </span>
                  <div className="bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl transition-colors group-hover:bg-primary/20">
                    <Icon className="text-primary h-8 w-8" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="hidden items-center justify-center lg:flex">
                    <ArrowRight className="text-muted-foreground/30 h-8 w-8" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function EventSection({
  title,
  events,
  isAuthenticated,
  viewAllLabel,
  goingSet,
  favoritedSet,
  alt,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
  isAuthenticated: boolean;
  viewAllLabel: string;
  goingSet: Set<string>;
  favoritedSet: Set<string>;
  alt?: boolean;
}) {
  return (
    <section className={alt ? 'bg-muted/30 py-24' : 'py-20'}>
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
          <Button variant="ghost" className="group" asChild>
            <Link href="/events" className="flex items-center gap-2">
              {viewAllLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isGoing={goingSet.has(event.id)}
              isFavorited={favoritedSet.has(event.id)}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
