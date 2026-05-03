import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders user-generated plain text and converts bare http(s) URLs into
 * clickable, safe `<a>` elements. No markdown, no HTML — strings stay
 * strings; only whole-word URL spans become anchors.
 *
 * Design intent (see chat: "стоит ли добавить форматирование"): comments
 * and reviews stay plain, but links must be live. Long-form content
 * (post body, descriptions, bio) gets the same treatment so users don't
 * have to copy-paste URLs out of unstyled text.
 *
 * Safety
 * ------
 * - Only http: / https: URLs are linkified. Anything else (javascript:,
 *   data:, mailto:, file: …) is rendered as plain text.
 * - URLs are never trusted as HTML — we build the React tree from string
 *   slices, never `dangerouslySetInnerHTML`.
 * - Links open in a new tab with `rel="noopener noreferrer nofollow"` so
 *   we don't leak referrer or vouch for the destination's PageRank.
 * - Trailing punctuation (`.,;:!?` and an unbalanced `)`) is stripped
 *   from the URL and rendered as text — typical "see https://x.com."
 *   should not include the period.
 *
 * Newlines
 * --------
 * Whitespace handling is the parent's job. Wrap this component in an
 * element with `className="whitespace-pre-wrap"` if you want to preserve
 * the user's line breaks.
 */

// Match http(s) URLs up to the first whitespace, angle bracket, paren or
// quote. We deliberately stop at `(` so URLs like "(https://example.com)"
// don't swallow the trailing paren; the trade-off is that paren-bearing
// paths (e.g. Wikipedia "_(layout)") get cut. Acceptable for plain comments;
// the markdown subset will solve this properly later.
const URL_REGEX = /\bhttps?:\/\/[^\s<>()"']+/gi;

const TRAILING_PUNCTUATION = /[).,;:!?]+$/;

function trimTrailingPunctuation(url: string): { clean: string; trailing: string } {
  const match = url.match(TRAILING_PUNCTUATION);
  if (!match) return { clean: url, trailing: '' };
  return { clean: url.slice(0, -match[0].length), trailing: match[0] };
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Truncate the visible URL for display while keeping it readable —
 * always preserve the host, and ellipsise the long path/query tail.
 */
function shortenForDisplay(url: string, max: number): string {
  if (url.length <= max) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const tail = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (tail.length <= 1) return host;
    const room = Math.max(1, max - host.length - 1);
    return `${host}${tail.slice(0, room)}…`;
  } catch {
    return `${url.slice(0, Math.max(1, max - 1))}…`;
  }
}

interface LinkifiedTextProps {
  text: string | null | undefined;
  /** Wraps the output in a <span> with this className. Omit to inline as a fragment. */
  className?: string;
  linkClassName?: string;
  /** Maximum visible characters of a link before it gets truncated with `…`. */
  maxLinkLength?: number;
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
  maxLinkLength = 60,
}: LinkifiedTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const { clean, trailing } = trimTrailingPunctuation(raw);

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    if (isSafeHttpUrl(clean)) {
      parts.push(
        <a
          key={`l-${key++}`}
          href={clean}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={cn(
            'break-words underline underline-offset-2 decoration-primary/40 transition-colors hover:text-primary hover:decoration-primary',
            linkClassName,
          )}
        >
          {shortenForDisplay(clean, maxLinkLength)}
        </a>,
      );
      if (trailing) parts.push(trailing);
    } else {
      parts.push(raw);
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (className) {
    return <span className={className}>{parts}</span>;
  }

  return <>{parts}</>;
}
