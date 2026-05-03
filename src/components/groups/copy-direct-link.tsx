'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface CopyDirectLinkProps {
  /** Path component, e.g. `/groups/cz/test-group`. */
  path: string;
  /** Origin to prefix when writing to the clipboard, e.g. `https://localisio.com`. */
  origin: string;
}

/**
 * Compact "direct link" row used in the group detail sidebar. Shows the
 * shareable path inline (so people can scan it) and copies the full URL —
 * including origin — to the clipboard on click. The button collapses
 * back to its idle state after 2 s so the visual feedback is brief.
 */
export function CopyDirectLink({ path, origin }: CopyDirectLinkProps) {
  const t = useTranslations('groups.detail');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${origin.replace(/\/$/, '')}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('linkCopied'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('linkCopyError'));
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t('copyLink')}
      className="group flex w-full items-center gap-2.5 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t('directLink')}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
      </div>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      )}
    </button>
  );
}
