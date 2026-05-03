'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { setRsvpVisibility } from '@/lib/actions/events';
import { cn } from '@/lib/utils';

interface RsvpVisibilityToggleProps {
  eventId: string;
  initialIsVisible: boolean;
  className?: string;
}

/**
 * Small inline switch shown next to the RSVP CTA so attendees can
 * privately attend an event without exposing their identity in the
 * public roster. The mutation is debounced through `useTransition`
 * so the toggle stays responsive even on slow connections.
 */
export function RsvpVisibilityToggle({
  eventId,
  initialIsVisible,
  className,
}: RsvpVisibilityToggleProps) {
  const t = useTranslations('events.safety');
  const [isVisible, setIsVisible] = useState(initialIsVisible);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    const previous = isVisible;
    setIsVisible(next);
    startTransition(async () => {
      const result = await setRsvpVisibility(eventId, next);
      if (result.error) {
        setIsVisible(previous);
        toast.error(result.error);
        return;
      }
      toast.success(next ? t('rsvpVisibleSaved') : t('rsvpHiddenSaved'));
    });
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-background/60 p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {isVisible ? (
          <Eye className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <EyeOff className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-snug">{t('rsvpVisibilityLabel')}</p>
          <p className="text-muted-foreground text-xs leading-snug">{t('rsvpVisibilityHelper')}</p>
        </div>
      </div>
      <Switch
        checked={isVisible}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={t('rsvpVisibilityLabel')}
      />
    </div>
  );
}
