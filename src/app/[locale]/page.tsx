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

      <SkylineDivider />

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

      {topGroups.length > 0 && <SkylineDivider flip />}

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

const SKYLINE_PATH = `M0,120 L0,88 L18,88 L18,72 L22,72 L22,64 L28,64 L28,72 L32,72 L32,88 L48,88 L48,52 L52,52 L52,44 L56,44 L56,38 L58,34 L60,38 L60,44 L64,44 L64,52 L68,52 L68,88 L82,88 L82,76 L88,76 L88,68 L94,68 L94,76 L100,76 L100,88 L112,88 L112,42 L116,42 L116,34 L120,34 L120,26 L122,22 L124,26 L124,34 L128,34 L128,42 L132,42 L132,56 L140,56 L140,88 L158,88 L158,80 L162,80 L162,74 L166,74 L166,68 L168,66 L170,68 L170,74 L174,74 L174,80 L178,80 L178,88 L192,88 L192,60 L196,60 L196,50 L200,50 L200,44 L204,44 L204,50 L208,50 L208,60 L212,60 L212,88 L228,88 L228,46 L230,46 L230,36 L232,36 L232,28 L233,28 L233,18 L234,10 L235,18 L235,28 L236,28 L236,36 L238,36 L238,46 L240,46 L240,88 L256,88 L256,70 L260,70 L260,62 L264,62 L264,56 L268,56 L268,62 L272,62 L272,70 L276,70 L276,88 L294,88 L294,48 L298,48 L298,40 L302,40 L302,32 L304,28 L306,32 L306,40 L310,40 L310,48 L314,48 L314,62 L322,62 L322,88 L340,88 L340,78 L344,78 L344,72 L348,72 L348,66 L352,66 L352,72 L356,72 L356,78 L360,78 L360,88 L376,88 L376,54 L380,54 L380,46 L384,46 L384,38 L386,34 L388,38 L388,46 L392,46 L392,54 L396,54 L396,88 L414,88 L414,82 L418,82 L418,76 L422,76 L422,70 L424,68 L426,70 L426,76 L430,76 L430,82 L434,82 L434,88 L450,88 L450,58 L454,58 L454,48 L458,48 L458,40 L460,36 L462,40 L462,48 L466,48 L466,58 L470,58 L470,88 L486,88 L486,64 L490,64 L490,56 L494,56 L494,48 L498,48 L498,56 L502,56 L502,64 L506,64 L506,88 L520,88 L520,34 L522,34 L522,24 L523.5,24 L523.5,14 L524.5,6 L525,2 L525.5,6 L526.5,14 L526.5,24 L528,24 L528,34 L530,34 L530,50 L534,50 L534,88 L550,88 L550,74 L554,74 L554,66 L558,66 L558,60 L562,60 L562,66 L566,66 L566,74 L570,74 L570,88 L586,88 L586,52 L590,52 L590,44 L594,44 L594,36 L596,32 L598,36 L598,44 L602,44 L602,52 L606,52 L606,88 L622,88 L622,80 L626,80 L626,74 L630,74 L630,68 L632,66 L634,68 L634,74 L638,74 L638,80 L642,80 L642,88 L658,88 L658,44 L660,44 L660,36 L662,36 L662,28 L664,24 L666,28 L666,36 L668,36 L668,44 L670,44 L670,58 L678,58 L678,88 L696,88 L696,70 L700,70 L700,62 L704,62 L704,54 L708,54 L708,62 L712,62 L712,70 L716,70 L716,88 L732,88 L732,56 L736,56 L736,46 L740,46 L740,38 L742,34 L744,38 L744,46 L748,46 L748,56 L752,56 L752,88 L768,88 L768,82 L772,82 L772,76 L776,76 L776,70 L778,68 L780,70 L780,76 L784,76 L784,82 L788,82 L788,88 L804,88 L804,40 L806,40 L806,30 L808,30 L808,22 L810,18 L812,22 L812,30 L814,30 L814,40 L816,40 L816,54 L824,54 L824,88 L840,88 L840,66 L844,66 L844,58 L848,58 L848,50 L852,50 L852,58 L856,58 L856,66 L860,66 L860,88 L876,88 L876,48 L880,48 L880,38 L884,38 L884,30 L886,26 L888,30 L888,38 L892,38 L892,48 L896,48 L896,88 L912,88 L912,76 L916,76 L916,68 L920,68 L920,62 L924,62 L924,68 L928,68 L928,76 L932,76 L932,88 L948,88 L948,36 L950,36 L950,26 L951.5,26 L951.5,16 L952.5,8 L953,4 L953.5,8 L954.5,16 L954.5,26 L956,26 L956,36 L958,36 L958,52 L966,52 L966,88 L982,88 L982,72 L986,72 L986,64 L990,64 L990,56 L994,56 L994,64 L998,64 L998,72 L1002,72 L1002,88 L1018,88 L1018,58 L1022,58 L1022,48 L1026,48 L1026,40 L1028,36 L1030,40 L1030,48 L1034,48 L1034,58 L1038,58 L1038,88 L1054,88 L1054,82 L1058,82 L1058,76 L1062,76 L1062,70 L1064,68 L1066,70 L1066,76 L1070,76 L1070,82 L1074,82 L1074,88 L1090,88 L1090,44 L1094,44 L1094,34 L1098,34 L1098,26 L1100,22 L1102,26 L1102,34 L1106,34 L1106,44 L1110,44 L1110,60 L1118,60 L1118,88 L1134,88 L1134,68 L1138,68 L1138,60 L1142,60 L1142,52 L1146,52 L1146,60 L1150,60 L1150,68 L1154,68 L1154,88 L1170,88 L1170,50 L1174,50 L1174,40 L1178,40 L1178,32 L1180,28 L1182,32 L1182,40 L1186,40 L1186,50 L1190,50 L1190,88 L1206,88 L1206,78 L1210,78 L1210,72 L1214,72 L1214,66 L1216,64 L1218,66 L1218,72 L1222,72 L1222,78 L1226,78 L1226,88 L1242,88 L1242,42 L1244,42 L1244,32 L1246,32 L1246,22 L1247,22 L1247,12 L1248,4 L1249,12 L1249,22 L1250,22 L1250,32 L1252,32 L1252,42 L1254,42 L1254,56 L1262,56 L1262,88 L1278,88 L1278,74 L1282,74 L1282,66 L1286,66 L1286,58 L1290,58 L1290,66 L1294,66 L1294,74 L1298,74 L1298,88 L1314,88 L1314,54 L1318,54 L1318,44 L1322,44 L1322,36 L1324,32 L1326,36 L1326,44 L1330,44 L1330,54 L1334,54 L1334,88 L1350,88 L1350,80 L1354,80 L1354,74 L1358,74 L1358,68 L1360,66 L1362,68 L1362,74 L1366,74 L1366,80 L1370,80 L1370,88 L1386,88 L1386,62 L1390,62 L1390,52 L1394,52 L1394,44 L1396,40 L1398,44 L1398,52 L1402,52 L1402,62 L1406,62 L1406,88 L1420,88 L1420,72 L1424,72 L1424,64 L1428,64 L1428,56 L1432,56 L1432,64 L1436,64 L1436,72 L1440,72 L1440,120 Z`;

function SkylineDivider({ flip }: { flip?: boolean } = {}) {
  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={`block h-20 w-full text-border/40 sm:h-24 md:h-28 lg:h-32${flip ? ' -scale-x-100' : ''}`}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={SKYLINE_PATH} />
      </svg>
    </div>
  );
}
