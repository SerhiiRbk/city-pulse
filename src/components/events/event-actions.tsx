'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Heart, Hourglass, Share2, Star, UserCheck, UserPlus } from 'lucide-react';
import {
  setInterest,
  toggleAttendance,
  toggleFavorite,
  type AttendanceStatus,
} from '@/lib/actions/events';
import { toast } from 'sonner';

interface EventActionsProps {
  eventId: string;
  initialStatus?: AttendanceStatus;
  /** @deprecated pass initialStatus instead; kept for compatibility */
  initialGoing?: boolean;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  isFull?: boolean;
  compact?: boolean;
}

export function EventActions({
  eventId,
  initialStatus,
  initialGoing,
  initialFavorited,
  isAuthenticated,
  isFull,
  compact,
}: EventActionsProps) {
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const resolvedInitial: AttendanceStatus =
    initialStatus ?? (initialGoing ? 'going' : 'none');
  const [status, setStatus] = useState<AttendanceStatus>(resolvedInitial);
  const [favorited, setFavorited] = useState(initialFavorited);

  async function handleToggleGoing() {
    if (!isAuthenticated) return;
    const prev = status;
    // Optimistic: going/waitlist → none, otherwise upgrade to going.
    const optimistic: AttendanceStatus =
      prev === 'going' || prev === 'waitlist'
        ? 'none'
        : isFull
          ? 'waitlist'
          : 'going';
    setStatus(optimistic);
    const result = await toggleAttendance(eventId);
    if (result.error) {
      setStatus(prev);
      return;
    }
    const next = result.status ?? 'none';
    setStatus(next);
    if (next === 'going') {
      toast.success(tDetail('registeredForEvent'));
    } else if (next === 'waitlist') {
      toast.success(tDetail('addedToWaitlist'));
    } else {
      toast.success(tDetail('cancelledAttendance'));
    }
  }

  async function handleToggleInterest() {
    if (!isAuthenticated) return;
    if (status === 'going' || status === 'waitlist') return;
    const prev = status;
    const next: AttendanceStatus = prev === 'interested' ? 'none' : 'interested';
    setStatus(next);
    const result = await setInterest(eventId, next === 'interested');
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
    const result = await toggleFavorite(eventId);
    if (result.error) {
      setFavorited(prev);
    } else {
      toast.success(result.favorited ? tDetail('addedToFavorites') : tDetail('removedFromFavorites'));
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

  const btnSize = compact ? 'sm' : 'lg';

  const { label, icon, variant } = (() => {
    if (status === 'going') {
      return {
        label: t('going'),
        icon: <UserCheck className={compact ? 'h-4 w-4' : 'h-5 w-5'} />,
        variant: 'secondary' as const,
      };
    }
    if (status === 'waitlist') {
      return {
        label: t('onWaitlist'),
        icon: <Hourglass className={compact ? 'h-4 w-4' : 'h-5 w-5'} />,
        variant: 'secondary' as const,
      };
    }
    if (isFull) {
      return {
        label: t('joinWaitlist'),
        icon: <Hourglass className={compact ? 'h-4 w-4' : 'h-5 w-5'} />,
        variant: 'default' as const,
      };
    }
    return {
      label: t('join'),
      icon: <UserPlus className={compact ? 'h-4 w-4' : 'h-5 w-5'} />,
      variant: 'default' as const,
    };
  })();

  const canShowInterest = status !== 'going' && status !== 'waitlist';
  const isInterested = status === 'interested';

  return (
    <div className="flex gap-2">
      {isAuthenticated && (
        <>
          <Button
            size={btnSize}
            variant={variant}
            onClick={handleToggleGoing}
            className={
              compact
                ? 'rounded-lg font-semibold'
                : 'flex-1 rounded-xl font-semibold shadow-sm'
            }
          >
            <span className="inline-flex items-center gap-2">
              {icon}
              {label}
            </span>
          </Button>
          {canShowInterest && (
            <Button
              size={btnSize}
              variant={isInterested ? 'secondary' : 'outline'}
              onClick={handleToggleInterest}
              aria-pressed={isInterested}
              title={isInterested ? t('interested') : t('markInterested')}
              className={compact ? 'rounded-lg' : 'rounded-xl shadow-sm'}
            >
              <Star
                className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${isInterested ? 'fill-amber-400 text-amber-500' : ''}`}
              />
            </Button>
          )}
          <Button size={btnSize} variant="outline" onClick={handleToggleFavorite} className={compact ? 'rounded-lg' : 'rounded-xl shadow-sm'}>
            <Heart className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </>
      )}
      {!compact && (
        <Button size="lg" variant="outline" onClick={handleShare} className="rounded-xl shadow-sm">
          <Share2 className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
