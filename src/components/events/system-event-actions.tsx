'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Share2, UserCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  toggleAttendance,
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
 * Action bar for system events (Афиша). Provides:
 *   - Save to calendar (Google / Apple / .ics)
 *   - "Going" toggle (same as community events)
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
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const tCommon = useTranslations('common');

  const [status, setStatus] = useState<AttendanceStatus>(initialStatus ?? 'none');
  const [favorited, setFavorited] = useState(initialFavorited);

  async function handleToggleGoing() {
    if (!isAuthenticated) return;
    const prev = status;
    // Optimistic: going → none, otherwise → going (no waitlist for system events)
    const optimistic: AttendanceStatus = prev === 'going' ? 'none' : 'going';
    setStatus(optimistic);
    const result = await toggleAttendance(event.id);
    if (result.error) {
      setStatus(prev);
      return;
    }
    const next = result.status ?? 'none';
    setStatus(next);
    if (next === 'going') {
      toast.success(tDetail('registeredForEvent'));
    } else {
      toast.success(tDetail('cancelledAttendance'));
    }
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

  const isGoing = status === 'going';

  const goingLabel = isGoing ? t('going') : t('join');
  const goingIcon = isGoing ? (
    <UserCheck className="h-5 w-5" />
  ) : (
    <UserPlus className="h-5 w-5" />
  );
  const goingVariant = isGoing ? ('secondary' as const) : ('default' as const);

  return (
    <div className="space-y-2">
      {/* Primary row — Save to calendar + Going + Favorite + Share */}
      <div className="flex flex-wrap items-stretch gap-2">
        <AddToCalendarButton event={event} className="flex-1 min-w-[220px] rounded-xl shadow-sm" />
        {isAuthenticated && (
          <>
            <Button
              size="lg"
              variant={goingVariant}
              onClick={handleToggleGoing}
              className="flex-1 rounded-xl font-semibold shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                {goingIcon}
                {goingLabel}
              </span>
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
