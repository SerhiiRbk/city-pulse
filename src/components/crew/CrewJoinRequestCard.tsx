'use client';

import { useTranslations } from 'next-intl';
import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CrewJoinRequestCardProps {
  id: string;
  requesterName: string;
  requesterAvatarUrl?: string | null;
  message?: string | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  loading?: boolean;
}

/**
 * Card for host/moderator to review and respond to join requests.
 * Displays requester info, optional message, and accept/reject actions.
 */
export function CrewJoinRequestCard({
  id,
  requesterName,
  requesterAvatarUrl,
  message,
  onAccept,
  onReject,
  loading = false,
}: CrewJoinRequestCardProps) {
  const t = useTranslations('crew');

  const initials = requesterName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5">
          {requesterAvatarUrl && (
            <AvatarImage src={requesterAvatarUrl} alt={requesterName} />
          )}
          <AvatarFallback>
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{requesterName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('request_to_join')}
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
              onClick={() => onReject(id)}
              disabled={loading}
            >
              {t('reject')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
