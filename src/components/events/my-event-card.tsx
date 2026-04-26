'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { EventCard } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Ban,
  CheckCircle,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelEvent,
  completeEvent,
  duplicateEvent,
  publishDraft,
} from '@/lib/actions/event-lifecycle';

type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

type MyEventCardEvent = Parameters<typeof EventCard>[0]['event'] & {
  status: EventStatus;
  is_blocked?: boolean;
  organizer_is_blocked?: boolean;
  duration_minutes?: number;
  ends_at?: string | null;
};

interface MyEventCardProps {
  event: MyEventCardEvent;
  isPast: boolean;
  isOrganizer: boolean;
  isGoing?: boolean;
  isWaitlisted?: boolean;
  isInterested?: boolean;
  isFavorited?: boolean;
}

export function MyEventCard({
  event,
  isPast,
  isOrganizer,
  isGoing,
  isWaitlisted,
  isInterested,
  isFavorited,
}: MyEventCardProps) {
  const t = useTranslations('events.myEvents.card');
  const tStatus = useTranslations('events.myEvents.status');
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const isBlocked = event.is_blocked || event.organizer_is_blocked;

  async function run(action: 'publish' | 'complete' | 'cancel' | 'duplicate') {
    setLoading(action);
    try {
      let result: { success?: boolean; error?: string; event?: { id: string } } | undefined;
      switch (action) {
        case 'publish':
          result = await publishDraft(event.id);
          break;
        case 'complete':
          result = await completeEvent(event.id);
          break;
        case 'cancel':
          result = await cancelEvent(event.id);
          break;
        case 'duplicate':
          result = await duplicateEvent(event.id);
          if (result?.event) {
            toast.success(t('duplicateSuccess'));
            router.push(`/events/${result.event.id}/edit`);
            return;
          }
          break;
      }
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(t(`${action}Success` as 'publishSuccess' | 'completeSuccess' | 'cancelSuccess'));
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const banner = (() => {
    if (isBlocked) {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <ShieldAlert className="h-3.5 w-3.5" />
          {tStatus('blocked')}
        </div>
      );
    }
    if (event.status === 'draft') {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-100/60 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200">
          <FileText className="h-3.5 w-3.5" />
          {tStatus('draft')}
        </div>
      );
    }
    if (event.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <Ban className="h-3.5 w-3.5" />
          {tStatus('cancelled')}
        </div>
      );
    }
    if (event.status === 'completed' || (event.status === 'published' && isPast)) {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-100/60 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-300/10 dark:text-emerald-200">
          <CheckCircle className="h-3.5 w-3.5" />
          {tStatus(event.status === 'completed' ? 'completed' : 'past')}
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-3">
      {banner}
      <EventCard
        event={event}
        isGoing={isGoing}
        isWaitlisted={isWaitlisted}
        isInterested={isInterested}
        isFavorited={isFavorited}
        isAuthenticated
      />
      {isOrganizer && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Always: edit + roster */}
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-full"
          >
            <Link href={`/events/${event.id}/edit`} className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {t('edit')}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-full"
          >
            <Link href={`/events/${event.id}#roster`} className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t('roster', { count: event.going_count })}
            </Link>
          </Button>

          {/* Draft → publish */}
          {event.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => run('publish')}
              disabled={!!loading}
              className="rounded-full"
            >
              {loading === 'publish' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{t('publish')}</span>
            </Button>
          )}

          {/* Published & not past → cancel + complete */}
          {event.status === 'published' && !isPast && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-destructive hover:bg-destructive/10"
                    disabled={!!loading}
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    {t('cancel')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('cancelConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('cancelConfirmDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancelDismiss')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => run('cancel')}>
                      {t('cancelConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Published & past → mark complete */}
          {event.status === 'published' && isPast && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => run('complete')}
              disabled={!!loading}
              className="rounded-full"
            >
              {loading === 'complete' ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('markComplete')}
            </Button>
          )}

          {/* Past or completed → recap link */}
          {(isPast || event.status === 'completed') && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="rounded-full"
            >
              <Link href={`/events/${event.id}#reviews`} className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t('viewRecap')}
              </Link>
            </Button>
          )}

          {/* Always (except draft): duplicate */}
          {event.status !== 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run('duplicate')}
              disabled={!!loading}
              className="rounded-full"
            >
              {loading === 'duplicate' ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('duplicate')}
            </Button>
          )}

          {/* Going count tucked at the end on small screens */}
          {!isPast && event.status === 'published' && event.going_count > 0 && (
            <Badge variant="secondary" className="rounded-full text-xs">
              {t('rsvps', { count: event.going_count })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
