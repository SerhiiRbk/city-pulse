import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { getMyCrews } from '@/lib/actions/crew';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('My Crews');

export default async function ProfileCrewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getUserProfile();

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('crew');
  const { crews = [] } = await getMyCrews();

  const activeCrews = crews.filter((c) => c.status === 'active');
  const archivedCrews = crews.filter((c) => c.status === 'archived');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('my_crews')}</h1>

      {crews.length === 0 ? (
        <p className="text-muted-foreground">{t('no_crews')}</p>
      ) : (
        <div className="space-y-8">
          {activeCrews.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">{t('active')}</h2>
              <div className="space-y-3">
                {activeCrews.map((crew) => (
                  <CrewItem key={crew.id} crew={crew} />
                ))}
              </div>
            </section>
          )}

          {archivedCrews.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">{t('archived')}</h2>
              <div className="space-y-3">
                {archivedCrews.map((crew) => (
                  <CrewItem key={crew.id} crew={crew} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CrewItem({
  crew,
}: {
  crew: {
    id: string;
    name: string;
    capacity: number;
    participant_count: number;
    role: string;
    event: { id: string; title: string };
  };
}) {
  return (
    <Link
      href={`/events/${crew.event.id}/crew/${crew.id}`}
      className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{crew.name}</p>
        <p className="truncate text-sm text-muted-foreground">{crew.event.title}</p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {crew.participant_count}/{crew.capacity}
        </span>
        <Badge variant="secondary" className="capitalize">
          {crew.role}
        </Badge>
      </div>
    </Link>
  );
}
