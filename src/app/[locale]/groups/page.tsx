import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGroups } from '@/lib/actions/groups';
import { getUser } from '@/lib/actions/auth';
import { GroupCard } from '@/components/groups/group-card';
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {user && (
          <Button asChild>
            <Link href="/groups/create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('create')}
            </Link>
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-lg">{t('noGroups')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
