import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGroups } from '@/lib/actions/groups';
import { getInterestCategories, getInterests } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { GroupCard } from '@/components/groups/group-card';
import { GroupsFilters } from '@/components/groups/groups-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { HeroImage } from '@/components/ui/hero-image';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, tPage] = await Promise.all([
    getTranslations({ locale, namespace: 'groups' }),
    getTranslations({ locale, namespace: 'groups.page' }),
  ]);

  return buildPageMetadata({
    locale,
    path: '/groups',
    title: t('title'),
    description: tPage('subtitle'),
  });
}

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const t = await getTranslations('groups');
  const tPage = await getTranslations('groups.page');
  const user = await getUser();
  const [interests, interestCategories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  const interestIds = filters.interest
    ? filters.interest.split(',').filter(Boolean)
    : [];
  const languageCodes = filters.language
    ? filters.language.split(',').filter(Boolean)
    : [];

  const groups = await getGroups({
    country: filters.country,
    city_id: filters.city_id,
    city: filters.city,
    interests: interestIds.length > 0 ? interestIds : undefined,
    languages: languageCodes.length > 0 ? languageCodes : undefined,
    q: filters.q,
    limit: 24,
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950">
        <HeroImage src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"
        />

        <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20 sm:pb-20 md:pt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4 text-amber-300" />
                {tPage('heroBadge')}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg">
                {tPage('subtitle')}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {[tPage('trust1'), tPage('trust2'), tPage('trust3')].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur sm:text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {user && (
              <Button
                asChild
                size="lg"
                className="shrink-0 self-start rounded-full px-6 shadow-xl"
              >
                <Link href="/groups/create" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('create')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Floating filter bar that overlaps the hero — creates depth and lets the photo breathe */}
      <div className="relative z-20 -mt-10 sm:-mt-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/95 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 sm:p-4">
            <GroupsFilters
              interests={interests}
              categories={interestCategories}
              currentFilters={filters}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{tPage('sectionLabel')}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              {groups.length > 0 ? tPage('resultsTitle', { count: groups.length }) : tPage('noResultsTitle')}
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {tPage('sectionBody')}
          </p>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            icon="groups"
            title={t('noGroups')}
            description={tPage('emptyDescription')}
          >
            {user && (
              <Button asChild>
                <Link href="/groups/create" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('create')}
                </Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
