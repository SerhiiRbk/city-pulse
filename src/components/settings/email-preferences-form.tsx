'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { setEmailDigestEnabled } from '@/lib/actions/email-preferences';

interface EmailPreferencesFormProps {
  initialDigestEnabled: boolean;
}

/**
 * Tiny client form managing the user's digest preference. Optimistic
 * update + sonner toast keeps the UX snappy; on failure we roll back
 * the toggle so the UI never lies about the persisted state.
 */
export function EmailPreferencesForm({
  initialDigestEnabled,
}: EmailPreferencesFormProps) {
  const t = useTranslations('settings.email');
  const [enabled, setEnabled] = useState(initialDigestEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setEmailDigestEnabled(next);
      if (result.error) {
        setEnabled(previous);
        toast.error(result.error);
        return;
      }
      toast.success(next ? t('toastSubscribed') : t('toastUnsubscribed'));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="space-y-1">
            <Label htmlFor="digest-toggle" className="text-sm font-medium">
              {t('digestLabel')}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('digestHelper')}
            </p>
          </div>
        </div>
        <Switch
          id="digest-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={t('digestLabel')}
        />
      </div>
    </div>
  );
}
