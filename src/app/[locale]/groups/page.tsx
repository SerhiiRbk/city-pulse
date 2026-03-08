import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGroups } from '@/lib/actions/groups';
import { getUser } from '@/lib/actions/auth';
import { GroupCard } from '@/components/groups/group-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus, Sparkles, UsersRound, CalendarDays } from 'lucide-react';

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('groups');
  const tPage = await getTranslations('groups.page');
  const user = await getUser();
  const groups = await getGroups({ limit: 24 });

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92" />

        <div className="relative z-10 container mx-auto px-4 pt-14 pb-10 sm:pt-16 sm:pb-12 md:pt-20 md:pb-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:mb-4 sm:text-sm">
                <Sparkles className="h-4 w-4" />
                {tPage('heroBadge')}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg md:text-xl">
                {tPage('subtitle')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  tPage('trust1'),
                  tPage('trust2'),
                  tPage('trust3'),
                ].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur-sm sm:text-sm">
                    {item}
                  </span>
                ))}
              </div>
              {user && (
                <div className="mt-6">
                  <Button asChild size="lg" className="rounded-full px-6 shadow-xl">
                    <Link href="/groups/create" className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      {t('create')}
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="hidden rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md lg:block">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">{tPage('sideLabel')}</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: UsersRound, title: tPage('sideItem1Title'), body: tPage('sideItem1Body') },
                    { icon: CalendarDays, title: tPage('sideItem2Title'), body: tPage('sideItem2Body') },
                    { icon: Sparkles, title: tPage('sideItem3Title'), body: tPage('sideItem3Body') },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold">{title}</p>
                          <p className="mt-1 text-sm text-white/65">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
