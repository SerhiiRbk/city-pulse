'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, UserX } from 'lucide-react';
import { markAttendance } from '@/lib/actions/events';
import { toast } from 'sonner';

type RosterStatus = 'going' | 'waitlist' | 'attended' | 'no_show';

export interface RosterEntry {
  user_id: string;
  status: RosterStatus;
  display_name: string;
  avatar_url: string | null;
}

interface AttendanceRosterProps {
  eventId: string;
  initialEntries: RosterEntry[];
}

export function AttendanceRoster({ eventId, initialEntries }: AttendanceRosterProps) {
  const t = useTranslations('events.attendance');
  const [entries, setEntries] = useState<RosterEntry[]>(initialEntries);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function counts(list: RosterEntry[]) {
    return {
      total: list.length,
      attended: list.filter((e) => e.status === 'attended').length,
      noShow: list.filter((e) => e.status === 'no_show').length,
      unmarked: list.filter((e) => e.status === 'going' || e.status === 'waitlist').length,
    };
  }

  async function set(userId: string, outcome: 'attended' | 'no_show' | 'going') {
    const prev = entries;
    setPendingId(userId);
    setEntries((list) =>
      list.map((e) => (e.user_id === userId ? { ...e, status: outcome } : e)),
    );
    startTransition(async () => {
      const result = await markAttendance(eventId, userId, outcome);
      setPendingId(null);
      if (result.error) {
        setEntries(prev);
        toast.error(result.error);
        return;
      }
      toast.success(
        outcome === 'attended'
          ? t('markedAttended')
          : outcome === 'no_show'
            ? t('markedNoShow')
            : t('reverted'),
      );
    });
  }

  const summary = counts(entries);

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{t('summaryAttended', { count: summary.attended })}</Badge>
          <Badge variant="secondary">{t('summaryNoShow', { count: summary.noShow })}</Badge>
          <Badge variant="outline">{t('summaryUnmarked', { count: summary.unmarked })}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        )}
        {entries.map((entry) => {
          const initials = entry.display_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const isAttended = entry.status === 'attended';
          const isNoShow = entry.status === 'no_show';
          const pending = pendingId === entry.user_id;
          return (
            <div
              key={entry.user_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={entry.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.status === 'waitlist'
                      ? t('statusWaitlist')
                      : entry.status === 'going'
                        ? t('statusGoing')
                        : entry.status === 'attended'
                          ? t('statusAttended')
                          : t('statusNoShow')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={isAttended ? 'default' : 'outline'}
                  disabled={pending}
                  onClick={() => set(entry.user_id, isAttended ? 'going' : 'attended')}
                  className="h-8 gap-1.5 rounded-lg text-xs"
                >
                  {pending && isAttended ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {t('markAttended')}
                </Button>
                <Button
                  size="sm"
                  variant={isNoShow ? 'destructive' : 'outline'}
                  disabled={pending}
                  onClick={() => set(entry.user_id, isNoShow ? 'going' : 'no_show')}
                  className="h-8 gap-1.5 rounded-lg text-xs"
                >
                  {pending && isNoShow ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserX className="h-3.5 w-3.5" />
                  )}
                  {t('markNoShow')}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
