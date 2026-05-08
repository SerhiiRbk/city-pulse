'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InviteLinkShareCardProps {
  url: string;
  crewName: string;
  eventName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InviteLinkShareCard({
  url,
  crewName,
  eventName,
}: InviteLinkShareCardProps) {
  const t = useTranslations('invite.share');
  const [copied, setCopied] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('copySuccess'));
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error(t('clipboardFailed'));
    }
  }, [url, t]);

  const handleShare = useCallback(async () => {
    const shareText = t('shareText', { crewName, eventName, url });

    try {
      await navigator.share({
        title: crewName,
        text: shareText,
        url,
      });
    } catch (error: unknown) {
      // User cancelled the share dialog — do nothing (Requirement 2.6)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Other errors are also silently ignored per requirement
    }
  }, [url, crewName, eventName, t]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
      {/* URL display — selectable text */}
      <p className="select-all break-all rounded-lg bg-background px-3 py-2 text-sm font-mono text-foreground border border-border/40">
        {url}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={copied ? 'secondary' : 'outline'}
          onClick={handleCopy}
          className="rounded-lg"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? t('copySuccess') : t('copyButton')}
        </Button>

        {canShare && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="rounded-lg"
          >
            <Share2 className="h-4 w-4" />
            {t('shareButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
