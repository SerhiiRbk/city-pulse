'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Copy, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { regenerateCalendarToken } from '@/lib/actions/calendar-token';

interface Props {
  /** Per-user feed token (URL secret). */
  initialToken: string;
  /** Absolute origin used to build the subscribe URL. */
  origin: string;
}

export function CalendarSubscribeCard({ initialToken, origin }: Props) {
  const t = useTranslations('events.myEvents.subscribe');
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();

  const subscribeUrl = `${origin}/api/calendar/me/ical?token=${token}`;
  // Google Calendar's "subscribe to URL" deep-link. Google strips the
  // protocol and re-attaches https://, so passing the bare https URL
  // works across mobile and desktop.
  const googleSubscribeUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(
    subscribeUrl,
  )}`;
  // Webcal protocol opens the system calendar app on iOS/macOS.
  const webcalUrl = subscribeUrl.replace(/^https?:\/\//, 'webcal://');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(webcalUrl);
      toast.success(t('icsCopied'));
    } catch {
      toast.error('Could not copy URL');
    }
  }

  async function handleRegenerate() {
    if (!confirm(t('regenerateConfirm'))) return;
    startTransition(async () => {
      const result = await regenerateCalendarToken();
      if (result.error || !result.token) {
        toast.error(result.error ?? 'Failed to regenerate');
        return;
      }
      setToken(result.token);
      toast.success(t('regenerated'));
    });
  }

  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-full">
            <a
              href={googleSubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Calendar className="mr-1.5 h-4 w-4" />
              {t('googleCta')}
            </a>
          </Button>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="rounded-full"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            {t('icsCta')}
          </Button>

          <Button asChild variant="ghost" className="rounded-full">
            <a href={subscribeUrl} download="localisio.ics">
              <Download className="mr-1.5 h-4 w-4" />
              {t('downloadCta')}
            </a>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={handleRegenerate}
            className="ml-auto rounded-full text-muted-foreground"
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t('regenerateCta')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
