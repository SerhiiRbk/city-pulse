import { setRequestLocale } from 'next-intl/server';
import { listFeatureFlags } from '@/lib/actions/feature-flags';
import { FeatureFlagsTable } from '@/components/admin/feature-flags-table';

export default async function FeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const flags = await listFeatureFlags();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Feature flags</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Roll out new features by percentage of authenticated users. The
          rollout bucket is deterministic per (user, slug), so the same user
          always sees the same answer for the same flag.
        </p>
      </header>
      <FeatureFlagsTable initialFlags={flags} />
    </div>
  );
}
