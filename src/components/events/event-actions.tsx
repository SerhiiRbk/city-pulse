'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { toggleAttendance, toggleFavorite } from '@/lib/actions/events';
import { toast } from 'sonner';

interface EventActionsProps {
  eventId: string;
  initialGoing: boolean;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  compact?: boolean;
}

export function EventActions({ eventId, initialGoing, initialFavorited, isAuthenticated, compact }: EventActionsProps) {
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const [going, setGoing] = useState(initialGoing);
  const [favorited, setFavorited] = useState(initialFavorited);

  async function handleToggleGoing() {
    if (!isAuthenticated) return;
    const prev = going;
    setGoing(!prev);
    const result = await toggleAttendance(eventId);
    if (result.error) {
      setGoing(prev);
    } else {
      toast.success(result.going ? tDetail('registeredForEvent') : tDetail('cancelledAttendance'));
    }
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
      toast.success('Link copied!');
    }
  }

  const btnSize = compact ? 'sm' : 'lg';

  return (
    <div className="flex gap-2">
      {isAuthenticated && (
        <>
          <Button
            size={btnSize}
            variant={going ? 'secondary' : 'default'}
            onClick={handleToggleGoing}
            className={compact ? 'rounded-lg font-semibold' : 'flex-1 rounded-xl font-semibold shadow-sm'}
          >
            {going ? t('going') : t('join')}
          </Button>
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
