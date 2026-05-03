'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Share2, Star, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  setInterest,
  toggleFavorite,
  type AttendanceStatus,
} from '@/lib/actions/events';

import { AddToCalendarButton } from './add-to-calendar';

interface SystemEventActionsProps {
  event: {
    id: string;
    title: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    starts_at: string;
    duration_minutes: number;
    is_online?: boolean;
  };
  initialStatus?: AttendanceStatus;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  /**
   * Optional CTA shown when the system event is meetup-eligible. When set,
   * we render a "Going with a group" button that links to the meetup flow
   * (wired in Block B4).
   */
  meetupCta?: {
    label: string;
    onClick?: () => void;
    href?: string;
    count?: number;
  };
}

/**
 * Action bar for system events (Афиша). The platform does not own attendance
 * for these listings, so we never offer "Going" / "Waitlist" — only:
 *   - Save to calendar (Google / Apple / .ics)
 *   - "Interested" toggle (soft signal, used for personal feeds + counters)
 *   - Favorite (private bookmark)
 *   - Share
 *   - Optional "Going with a group" CTA that opens the meetup composer.
 */
export function SystemEventActions({
  event,
  initialStatus,
  initialFavorited,
  isAuthenticated,
  meetupCta,
}: SystemEventActionsProps) {
  const t = useTranslations('events.systemActions');
  const tDetail = useTranslations('events.detail');
  const tCommon = useTranslations('common');

  const [status, setStatus] = useState<AttendanceStatus>(initialStatus ?? 'none');
  const [favorited, setFavorited] = useState(initialFavorited);

  async function handleToggleInterest() {
    if (!isAuthenticated) return;
    const prev = status;
    const next: AttendanceStatus = prev === 'interested' ? 'none' : 'interested';
    setStatus(next);
    const result = await setInterest(event.id, next === 'interested');
    if (result.error) {
      setStatus(prev);
      return;
    }
    setStatus(result.status ?? 'none');
    if (next === 'interested') toast.success(tDetail('markedInterested'));
    else toast.success(tDetail('unmarkedInterested'));
  }

  async function handleToggleFavorite() {
    if (!isAuthenticated) return;
    const prev = favorited;
    setFavorited(!prev);
    const result = await toggleFavorite(event.id);
    if (result.error) {
      setFavorited(prev);
    } else {
      toast.success(
        result.favorited ? tDetail('addedToFavorites') : tDetail('removedFromFavorites'),
      );
    }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(tCommon('linkCopied'));
    }
  }

  const isInterested = status === 'interested';

  return (
    <div className="space-y-2">
      {/* Primary row — Save to calendar + Interested + Favorite + Share.
          Icon-only buttons use the square `icon-lg` size (40×40) instead of
          the default `size` (which is rectangular due to `has-[>svg]:px-4`)
          so they don't visually crowd the sidebar at narrow widths and
          their icons stay properly centered without clipping. */}
      <div className="flex flex-wrap items-stretch gap-2">
        <AddToCalendarButton event={event} className="flex-1 min-w-[220px] rounded-xl shadow-sm" />
        {isAuthenticated && (
          <>
            <Button
              size="icon-lg"
              variant={isInterested ? 'secondary' : 'outline'}
              onClick={handleToggleInterest}
              aria-pressed={isInterested}
              title={isInterested ? t('interested') : t('markInterested')}
              className="rounded-xl shadow-sm"
            >
              <Star
                className={`h-5 w-5 ${isInterested ? 'fill-amber-400 text-amber-500' : ''}`}
              />
            </Button>
            <Button
              size="icon-lg"
              variant="outline"
              onClick={handleToggleFavorite}
              aria-pressed={favorited}
              className="rounded-xl shadow-sm"
            >
              <Heart
                className={`h-5 w-5 ${favorited ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
          </>
        )}
        <Button
          size="icon-lg"
          variant="outline"
          onClick={handleShare}
          className="rounded-xl shadow-sm"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Optional secondary row — "Going with a group" CTA */}
      {meetupCta &&
        (meetupCta.href ? (
          <Button
            asChild
            variant="default"
            className="w-full rounded-xl shadow-sm"
          >
            <a href={meetupCta.href}>
              <Users className="mr-2 h-4 w-4" />
              <span>{meetupCta.label}</span>
              {meetupCta.count != null && meetupCta.count > 0 ? (
                <span className="ml-auto rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs">
                  {meetupCta.count}
                </span>
              ) : null}
            </a>
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={meetupCta.onClick}
            className="w-full rounded-xl shadow-sm"
          >
            <Users className="mr-2 h-4 w-4" />
            <span>{meetupCta.label}</span>
            {meetupCta.count != null && meetupCta.count > 0 ? (
              <span className="ml-auto rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs">
                {meetupCta.count}
              </span>
            ) : null}
          </Button>
        ))}
    </div>
  );
}
