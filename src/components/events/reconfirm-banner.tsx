'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { reconfirmAttendance } from '@/lib/actions/events';

interface ReconfirmBannerProps {
  eventId: string;
  /** When true, banner is rendered. Hides itself after success. */
  initiallyOpen: boolean;
}

/**
 * Inline banner shown on the event detail page when the user has
 * received a 24h reconfirm prompt and has not yet confirmed their
 * spot. Confirming flips the row's `confirmed` flag so the auto-
 * release cron skips them.
 */
export function ReconfirmBanner({ eventId, initiallyOpen }: ReconfirmBannerProps) {
  const t = useTranslations('events.reconfirm');
  const [open, setOpen] = useState(initiallyOpen);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleConfirm() {
    startTransition(async () => {
      const result = await reconfirmAttendance(eventId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('confirmed'));
      setOpen(false);
    });
  }

  return (
    <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {t('title')}
          </p>
          <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/90">
            {t('body')}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {t('cta')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
