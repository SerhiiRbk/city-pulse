'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CrewInvitationCardProps {
  id: string;
  crewName: string;
  eventTitle: string;
  inviterName: string;
  message?: string | null;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  loading?: boolean;
}

/**
 * Notification card for crew invitations.
 * Displays crew info, invitation message, and accept/decline actions.
 * Used by invitees to respond to crew invitations.
 */
export function CrewInvitationCard({
  id,
  crewName,
  eventTitle,
  inviterName,
  message,
  onAccept,
  onDecline,
  loading = false,
}: CrewInvitationCardProps) {
  const t = useTranslations('crew');

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{crewName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('invitation_default', { hostName: inviterName, eventTitle })}
          </p>

          {message && (
            <p className="mt-2 text-sm text-foreground/80 italic">
              &ldquo;{message}&rdquo;
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(id)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('accept')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecline(id)}
              disabled={loading}
            >
              {t('decline')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
