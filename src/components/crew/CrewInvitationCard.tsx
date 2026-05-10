'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Check, X, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { respondToInvitation } from '@/lib/actions/crew';

interface CrewInvitationCardProps {
  invitation: {
    id: string;
    crew_id: string;
    crew_name: string;
    event_id: string;
    event_title: string;
    inviter_name: string;
    message: string | null;
  };
}

export function CrewInvitationCard({ invitation }: CrewInvitationCardProps) {
  const t = useTranslations('crew');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [responded, setResponded] = useState(false);

  function handleRespond(accept: boolean) {
    startTransition(async () => {
      const result = await respondToInvitation({
        invitation_id: invitation.id,
        accept,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setResponded(true);

      if (accept) {
        toast.success(t('request_accepted'));
        router.push(`/events/${invitation.event_id}/crew/${invitation.crew_id}`);
      } else {
        toast.success(t('request_rejected'));
      }
    });
  }

  if (responded) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{invitation.crew_name}</p>
          <p className="text-sm text-muted-foreground">{invitation.event_title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('invitation_default', {
              hostName: invitation.inviter_name,
              eventTitle: invitation.event_title,
            })}
          </p>
          {invitation.message && (
            <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
              &ldquo;{invitation.message}&rdquo;
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => handleRespond(true)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRespond(false)}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
