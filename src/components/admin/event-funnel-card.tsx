import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { Eye, Users, CheckCheck, AlertTriangle } from 'lucide-react';
import type { EventFunnelRow } from '@/lib/actions/event-funnel';

interface EventFunnelCardProps {
  rows: EventFunnelRow[];
  /** Title shown in the card header. */
  title: string;
  /** Optional helper copy under the title. */
  subtitle?: string;
}

/**
 * Compact, table-style listing of per-event funnel data. Each row
 * shows views (30d), RSVPs, attended, and the two conversion rates.
 *
 * The component is rendered as a plain server component — the
 * caller (admin dashboard or organizer events page) decides what to
 * fetch.
 */
export function EventFunnelCard({ rows, title, subtitle }: EventFunnelCardProps) {
  const t = useTranslations('admin.funnel');

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && (
          <p className="text-muted-foreground text-xs leading-relaxed">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="px-2 py-2 text-left font-medium">{t('event')}</th>
                  <th className="px-2 py-2 text-right font-medium" title={t('viewsHint')}>
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="h-3 w-3" /> {t('views30d')}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3 w-3" /> {t('rsvps')}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <CheckCheck className="h-3 w-3" /> {t('attended')}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-right font-medium" title={t('rsvpRateHint')}>
                    {t('rsvpRate')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium" title={t('attendedRateHint')}>
                    {t('attendedRate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.event_id} className="border-t border-border/40">
                    <td className="px-2 py-2 align-top">
                      <Link
                        href={`/events/${row.event_id}`}
                        className="block max-w-[280px] truncate font-medium hover:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {new Date(row.starts_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.views_30d.toLocaleString()}
                      <p className="text-muted-foreground text-xs">
                        {t('uniqueViewers', { count: row.unique_viewers })}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.going_count.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.attended_count.toLocaleString()}
                      {row.no_show_count > 0 && (
                        <p className="flex items-center justify-end gap-1 text-amber-600 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          {t('noShow', { count: row.no_show_count })}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.view_to_rsvp_rate == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={
                            row.view_to_rsvp_rate >= 10
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : row.view_to_rsvp_rate >= 3
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }
                        >
                          {row.view_to_rsvp_rate}%
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.rsvp_to_attended_rate == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={
                            row.rsvp_to_attended_rate >= 70
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : row.rsvp_to_attended_rate >= 50
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }
                        >
                          {row.rsvp_to_attended_rate}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
