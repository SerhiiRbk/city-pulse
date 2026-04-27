import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { EditorialCalendar } from '@/components/admin/system-events/editorial-calendar';

// Dynamic rendering is implicit via the Supabase server client (which reads
// cookies()). cacheComponents forbids `export const dynamic` segment config.

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}

/**
 * Month view of all system events. Drag-and-drop reschedules an event to
 * a new day (time-of-day is preserved). Default range: current month plus
 * a small overflow into the previous/next so the grid is always full.
 */
export default async function EditorialCalendarPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { month } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('admin.systemEvents.calendar');
  const supabase = await createClient();

  const anchor = parseAnchor(month);
  const rangeStart = startOfMonth(anchor);
  const rangeEnd = endOfMonth(anchor);
  // Pad by ~1 week each side to populate the visible grid.
  const queryStart = new Date(rangeStart);
  queryStart.setDate(queryStart.getDate() - 7);
  const queryEnd = new Date(rangeEnd);
  queryEnd.setDate(queryEnd.getDate() + 7);

  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, city, editorial_status, status')
    .eq('is_system', true)
    .gte('starts_at', queryStart.toISOString())
    .lte('starts_at', queryEnd.toISOString())
    .order('starts_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
          <Link href="/admin/system-events">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{formatMonth(anchor, locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditorialCalendar
            anchorIso={anchor.toISOString()}
            events={(events ?? []).map((e) => ({
              id: e.id,
              title: e.title,
              starts_at: e.starts_at,
              city: e.city,
              editorial_status: (e.editorial_status as string | null) ?? 'draft',
              status: e.status,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function parseAnchor(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function formatMonth(d: Date, locale: string) {
  return d.toLocaleString(locale, { month: 'long', year: 'numeric' });
}
