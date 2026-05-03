import React, { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, MapPin, Users, CalendarDays, Heart, Globe, Shield,
  CalendarPlus, Bell, UsersRound, Sparkles,
} from 'lucide-react';
import {
  getCachedLandingEvents,
  getCachedLandingTopGroups,
} from '@/lib/actions/landing-cached';
import { EventCard } from '@/components/events/event-card';
import { GroupCard } from '@/components/groups/group-card';
import { HeroAuthCTA } from '@/components/landing/hero-auth-cta';
import { LandingStats } from '@/components/landing/landing-stats';
import { TonightInCity } from '@/components/landing/tonight-in-city';
import { generateOrganizationJsonLd, generateWebSiteJsonLd } from '@/lib/json-ld';
import { HeroImage } from '@/components/ui/hero-image';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });

  return buildPageMetadata({
    locale,
    path: '',
    title: t('hero.title'),
    description: t('hero.subtitle'),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');

  const [events, topGroups] = await Promise.all([
    getCachedLandingEvents(24),
    getCachedLandingTopGroups(4),
  ]);

  const featureCards = [
    { icon: MapPin, title: t('features.localEvents'), desc: t('features.localEventsDesc') },
    { icon: Users, title: t('features.communities'), desc: t('features.communitiesDesc') },
    { icon: CalendarDays, title: t('features.calendar'), desc: t('features.calendarDesc') },
    { icon: Heart, title: t('features.connections'), desc: t('features.connectionsDesc') },
    { icon: Globe, title: t('features.multilingual'), desc: t('features.multilingualDesc') },
    { icon: Shield, title: t('features.safety'), desc: t('features.safetyDesc') },
  ];

  const orgJsonLd = generateOrganizationJsonLd({ description: t('hero.subtitle') });
  const websiteJsonLd = generateWebSiteJsonLd({
    locale,
    description: t('hero.subtitle'),
  });

  const howItWorks = [
    { step: '01', icon: CalendarPlus, title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
    { step: '02', icon: Globe, title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
    { step: '03', icon: Bell, title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
    { step: '04', icon: UsersRound, title: t('howItWorks.step4Title'), desc: t('howItWorks.step4Desc') },
  ];

  const trustPoints = [
    t('marketing.trustPoint1'),
    t('marketing.trustPoint2'),
    t('marketing.trustPoint3'),
  ];

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <HeroImage src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1800&q=80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.22),transparent_32%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="max-w-3xl">
              <Badge className="mb-5 border-white/15 bg-white/10 text-white backdrop-blur-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t('marketing.heroBadge')}
              </Badge>
              <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white md:text-6xl">
                {t('hero.title')}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
                {t('hero.subtitle')}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {trustPoints.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm"
                  >
                    {point}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-12 rounded-full px-8 text-base shadow-xl">
                  <Link href="/events" className="flex items-center gap-2">
                    {t('hero.cta')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Suspense fallback={null}>
                  <HeroAuthCTA />
                </Suspense>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <Suspense fallback={null}>
                <TonightInCity locale={locale} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <LandingStats locale={locale} />
      </Suspense>

      {/* Features */}
      <section className="container mx-auto px-4 pt-24 pb-14">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{t('marketing.whyTitle')}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            {t('marketing.whySubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="group rounded-3xl border-border/50 bg-background/80 shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-8 w-8 text-primary" />
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

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Events */}
      {events.length > 0 && (
        <div className="pt-4">
          <EventSection
            title={t('sections.topEvents')}
            events={events}
            viewAllLabel={t('sections.viewAllEvents')}
          />
        </div>
      )}

      {topGroups.length > 0 && <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />}

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
      {events.length === 0 && topGroups.length === 0 && (
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
      <section id="how-it-works" className="border-t bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{t('howItWorks.title')}</h2>
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

      <section id="contact" className="border-t bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-8 shadow-sm md:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-4 rounded-full border-primary/20 bg-primary/5 text-primary">
                {t('marketing.contactBadge')}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t('marketing.contactTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                {t('marketing.contactSubtitle')}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="rounded-full px-8">
                  <Link href="/events">{t('marketing.contactPrimary')}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-full px-8">
                  <Link href="/groups">{t('marketing.contactSecondary')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type LandingEvent = Awaited<ReturnType<typeof getCachedLandingEvents>>[number];

function EventSection({
  title,
  events,
  viewAllLabel,
}: {
  title: string;
  events: LandingEvent[];
  viewAllLabel: string;
}) {
  return (
    <section className="py-14">
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
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}
