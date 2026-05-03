import { getTranslations } from 'next-intl/server';
import { getCachedLandingStats } from '@/lib/actions/landing-cached';

function formatCompact(value: number, locale: string): string {
  if (value < 1) return '0';
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

export async function LandingStats({ locale }: { locale: string }) {
  const [stats, t] = await Promise.all([
    getCachedLandingStats(),
    getTranslations('landing.marketing'),
  ]);

  // Honest social proof: hide block entirely until the community actually exists
  const total = stats.events + stats.groups + stats.members;
  if (total < 5) return null;

  const cells = [
    { value: stats.events, label: t('statsEvents') },
    { value: stats.groups, label: t('statsGroups') },
    { value: stats.members, label: t('statsMembers') },
    { value: stats.cities, label: t('statsCities') },
  ];

  return (
    <section className="border-b bg-card">
      <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-10 sm:grid-cols-4">
        {cells.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatCompact(value, locale)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
