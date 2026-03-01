import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, Users, CalendarDays, Heart, Globe, Shield } from 'lucide-react';
import { getUser } from '@/lib/actions/auth';
import { getTodayEvents, getTomorrowEvents, getWeekendEvents, getPopularEvents, getTopGroups } from '@/lib/actions/landing';
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

  const featureCards = [
    { icon: MapPin, title: t('features.localEvents'), desc: t('features.localEventsDesc') },
    { icon: Users, title: t('features.communities'), desc: t('features.communitiesDesc') },
    { icon: CalendarDays, title: t('features.calendar'), desc: t('features.calendarDesc') },
    { icon: Heart, title: t('features.connections'), desc: t('features.connectionsDesc') },
    { icon: Globe, title: t('features.multilingual'), desc: t('features.multilingualDesc') },
    { icon: Shield, title: t('features.safety'), desc: t('features.safetyDesc') },
  ];

  const orgJsonLd = generateOrganizationJsonLd();

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* Hero */}
      <section className="from-primary/5 via-background to-background relative overflow-hidden bg-gradient-to-b">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Globe className="mr-1 h-3 w-3" />
              Prague &middot; Berlin &middot; Barcelona &middot; Tel Aviv
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="text-muted-foreground mb-8 text-lg md:text-xl">{t('hero.subtitle')}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/events" className="flex items-center gap-2">
                  {t('hero.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button variant="outline" size="lg" asChild>
                  <Link href="/register">{tNav('register')}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="text-primary mb-2 h-8 w-8" />
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <EventSection
          title={t('sections.todayEvents')}
          events={todayEvents}
          isAuthenticated={!!user}
          viewAllLabel={t('sections.viewAllEvents')}
        />
      )}

      {/* Tomorrow's Events */}
      {tomorrowEvents.length > 0 && (
        <EventSection
          title={t('sections.tomorrowEvents')}
          events={tomorrowEvents}
          isAuthenticated={!!user}
          viewAllLabel={t('sections.viewAllEvents')}
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
        />
      )}

      {/* Popular Events (fallback if no time-based events) */}
      {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekendEvents.length === 0 && popularEvents.length > 0 && (
        <EventSection
          title={t('sections.topEvents')}
          events={popularEvents}
          isAuthenticated={!!user}
          viewAllLabel={t('sections.viewAllEvents')}
        />
      )}

      {/* Top Groups */}
      {topGroups.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-3xl font-bold">{t('sections.topGroups')}</h2>
              <Button variant="ghost" asChild>
                <Link href="/groups" className="flex items-center gap-1">
                  {t('sections.viewAllGroups')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {topGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state — show placeholders if no data at all */}
      {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekendEvents.length === 0 && popularEvents.length === 0 && topGroups.length === 0 && (
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold">{t('sections.topEvents')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('hero.subtitle')}
            </p>
            <Button asChild>
              <Link href="/events" className="flex items-center gap-2">
                {t('sections.viewAllEvents')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* CTA */}
      {!user && (
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">{t('cta.title')}</h2>
            <p className="mx-auto mb-8 max-w-xl text-lg opacity-90">
              {t('cta.subtitle')}
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register" className="flex items-center gap-2">
                {t('cta.button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  isAuthenticated,
  viewAllLabel,
  alt,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
  isAuthenticated: boolean;
  viewAllLabel: string;
  alt?: boolean;
}) {
  return (
    <section className={alt ? 'bg-muted/50 py-16' : 'py-16'}>
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold">{title}</h2>
          <Button variant="ghost" asChild>
            <Link href="/events" className="flex items-center gap-1">
              {viewAllLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} isAuthenticated={isAuthenticated} />
          ))}
        </div>
      </div>
    </section>
  );
}
