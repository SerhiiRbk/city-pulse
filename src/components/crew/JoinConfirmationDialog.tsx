'use client';

import { useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { joinViaInviteLink } from '@/lib/actions/crew-invite';
import { formatDate } from '@/lib/utils';
import type { CrewInviteData, EventInviteData, InviterData } from '@/lib/actions/crew-invite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JoinConfirmationDialogProps {
  crew: CrewInviteData;
  event: EventInviteData;
  inviter: InviterData;
  token: string;
  locale: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component rendered on the invite link landing page when the token
 * is valid. Displays crew, event, and inviter information and allows the
 * user to join or decline.
 *
 * Requirements: 3.1, 3.8, 3.16, 3.17, 4.5, 4.9
 */
export function JoinConfirmationDialog({
  crew,
  event,
  inviter,
  token,
  locale: localeProp,
}: JoinConfirmationDialogProps) {
  const t = useTranslations('invite.join');
  const tError = useTranslations('invite.error');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const availableSpots = crew.capacity - crew.participant_count;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleJoin() {
    startTransition(async () => {
      const result = await joinViaInviteLink({ token });

      if (result.error) {
        // Race condition: crew filled between page load and join confirmation (Req 4.9)
        if (result.error === 'Crew is full') {
          toast.error(tError('crewFull'));
          router.push(`/events/${event.id}`);
          return;
        }

        toast.error(result.error);
        return;
      }

      // Success — redirect to crew detail page (Req 4.5)
      if (result.crewId && result.eventId) {
        router.push(`/events/${result.eventId}/crew/${result.crewId}`);
      }
    });
  }

  function handleDecline() {
    // Redirect to event detail page without joining (Req 3.17)
    router.push(`/events/${event.id}`);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
        {/* Title */}
        <h2 className="text-xl font-semibold">{t('confirmTitle')}</h2>

        {/* Confirmation message (Req 3.1) */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('confirmMessage', {
            crewName: crew.name,
            eventName: event.title,
            inviterName: inviter.display_name,
          })}
        </p>

        {/* Inviter info */}
        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
          <Avatar className="h-9 w-9">
            <AvatarImage src={inviter.avatar_url ?? undefined} alt={inviter.display_name} />
            <AvatarFallback>
              {inviter.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{inviter.display_name}</span>
        </div>

        {/* Event details (Req 3.8) */}
        <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-3">
          {/* Event name */}
          <p className="text-sm font-semibold">{event.title}</p>

          {/* Date/time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(event.starts_at, locale)}</span>
          </div>

          {/* Venue */}
          {(event.address || event.city) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{[event.address, event.city].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {/* Participant count and available spots */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {crew.participant_count}/{crew.capacity}
              {availableSpots > 0 && (
                <> &middot; {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} available</>
              )}
            </span>
          </div>
        </div>

        {/* Action buttons (Req 3.16, 3.17) */}
        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1 rounded-xl"
            onClick={handleJoin}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t('joining')}
              </>
            ) : (
              t('joinButton')
            )}
          </Button>

          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handleDecline}
            disabled={isPending}
          >
            {t('declineButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
