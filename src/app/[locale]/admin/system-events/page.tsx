import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Calendar, ExternalLink, FileText, Plus, Sparkles } from 'lucide-react';
import {
  getEditorialPipeline,
  getSystemEventDrafts,
} from '@/lib/actions/system-events-editorial';

// Dynamic rendering is implicit: requireSiteStaff() reads cookies(), which
// opts this route out of static generation under cacheComponents. The legacy
// `export const dynamic = 'force-dynamic'` is incompatible with Next 16
// Cache Components and must not be added.

const NEW_DRAFT = 'new';

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  review: 'secondary',
  scheduled: 'default',
  published: 'default',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Editorial dashboard for the Афиша pipeline. Three column layout:
 *   1. Pipeline summary per city, anchored to the per-city `monthly_target`.
 *   2. Drafts in flight, ranked by upcoming starts_at so editors finish
 *      what's most time-sensitive.
 *   3. Quick links to the composer, calendar, and templates.
 *
 * The page intentionally avoids a kanban — pipelines for ~10 events/week
 * fit better in a row-based "what needs attention" stream.
 */
export default async function AdminSystemEventsDashboard({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.systemEvents.dashboard');
  const tStatus = await getTranslations('admin.systemEvents.composer.status');

  const [pipeline, draftsResult] = await Promise.all([
    getEditorialPipeline(),
    getSystemEventDrafts(),
  ]);

  if ('error' in pipeline && pipeline.error) {
    return <p className="text-sm text-destructive">{pipeline.error}</p>;
  }

  const byCity =
    'byCity' in pipeline ? (pipeline.byCity as Record<string, CityRow>) : {};
  const targets =
    'targets' in pipeline
      ? (pipeline.targets as Array<{ city: string; monthly_target: number; is_active: boolean }>)
      : [];
  const drafts = draftsResult.rows ?? [];

  const cities = Object.keys(byCity).sort((a, b) => {
    const ta = targets.find((t) => t.city === a)?.monthly_target ?? 0;
    const tb = targets.find((t) => t.city === b)?.monthly_target ?? 0;
    return tb - ta;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/system-events/calendar">
              <Calendar className="mr-1 h-4 w-4" />
              {t('openCalendar')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/system-events/templates">
              <FileText className="mr-1 h-4 w-4" />
              {t('openTemplates')}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/system-events/composer/${NEW_DRAFT}`}>
              <Plus className="mr-1 h-4 w-4" />
              {t('newDraft')}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('pipelineTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('pipelineEmpty')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cities.map((city) => {
                const row = byCity[city];
                const target = targets.find((t) => t.city === city);
                const monthlyTarget = target?.monthly_target ?? 0;
                const progress =
                  monthlyTarget > 0
                    ? Math.min(100, Math.round((row.thisMonth / monthlyTarget) * 100))
                    : 0;
                return (
                  <div key={city} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{city}</p>
                      {monthlyTarget > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {row.thisMonth}/{monthlyTarget}
                        </span>
                      )}
                    </div>
                    {monthlyTarget > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${
                            progress >= 100
                              ? 'bg-emerald-500'
                              : progress >= 50
                                ? 'bg-primary'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    <dl className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                      <Stat label={tStatus('draft')} value={row.draft} />
                      <Stat label={tStatus('review')} value={row.review} />
                      <Stat label={tStatus('scheduled')} value={row.scheduled} />
                      <Stat label={tStatus('published')} value={row.published} />
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('inFlightTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('inFlightEmpty')}
            </p>
          ) : (
            <ul className="divide-y">
              {drafts.map((d) => {
                const editorialStatus =
                  (d.editorial_status as string | null) ?? 'draft';
                return (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/system-events/composer/${d.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {d.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {d.city && <span>{d.city}</span>}
                        <span>·</span>
                        <span>{new Date(d.starts_at).toLocaleString()}</span>
                        {d.partner_name && (
                          <>
                            <span>·</span>
                            <span>{d.partner_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={STATUS_VARIANT[editorialStatus] ?? 'outline'}
                        className="text-xs"
                      >
                        {tStatus(editorialStatus as never)}
                      </Badge>
                      {d.status === 'published' && (
                        <Link
                          href={`/events/${d.id}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CityRow {
  draft: number;
  review: number;
  scheduled: number;
  published: number;
  thisMonth: number;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
      <div className="text-sm font-semibold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
