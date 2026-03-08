import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGroups } from '@/lib/actions/groups';
import { getUser } from '@/lib/actions/auth';
import { GroupCard } from '@/components/groups/group-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('groups');
  const user = await getUser();
  const groups = await getGroups({ limit: 24 });

  return (
    <div>
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />

        <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
          <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-6xl">
                {t('title')}
              </h1>
              <p className="mt-3 text-xl text-white/80 drop-shadow">
                Find your community
              </p>
            </div>
            {user && (
              <Button asChild size="lg" className="rounded-full px-6 shadow-xl transition-transform hover:scale-105">
                <Link href="/groups/create" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('create')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {groups.length === 0 ? (
          <EmptyState
            icon="groups"
            title={t('noGroups')}
            description="Be the first to create a community"
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
