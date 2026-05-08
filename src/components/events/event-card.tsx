'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Calendar, Users, Globe, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  toggleAttendance,
  toggleFavorite,
  type AttendanceStatus,
} from '@/lib/actions/events';
import { toast } from 'sonner';
import { useState } from 'react';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { FriendsGoingCue } from '@/components/events/friends-going-cue';
import type { FriendGoing } from '@/lib/actions/friends-going';
import { SafetyTagBadges } from '@/components/events/safety-tag-badges';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string | null;
    photos: string[];
    starts_at: string;
    city: string | null;
    city_name?: string | null;
    city_translations?: Record<string, string> | null;
    country: string | null;
    is_online: boolean;
    is_free: boolean;
    price: number | null;
    currency: string | null;
    max_attendees: number | null;
    going_count: number;
    waitlist_count?: number;
    interested_count?: number;
    is_system?: boolean;
    languages?: string[];
    category_slug: string | null;
    category_translations: Record<string, string> | null;
    safety_tags?: string[] | null;
  };
  isGoing?: boolean;
  isWaitlisted?: boolean;
  isInterested?: boolean;
  isFavorited?: boolean;
  isAuthenticated?: boolean;
  /**
   * People the viewer follows who are going / interested in this
   * event. Pre-resolved by the parent so the card stays a pure
   * presentational client component (no fetching at render time).
   */
  friendsGoing?: FriendGoing[];
}

export function EventCard({
  event,
  isGoing: initialGoing,
  isWaitlisted: initialWait,
  isInterested: initialInterested,
  isFavorited: initialFav,
  isAuthenticated,
  friendsGoing,
}: EventCardProps) {
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const locale = useLocale();
  const cityLabel = event.city_translations?.[locale] || event.city_name || event.city || '';
  const countryDisplay = event.country
    ? (() => {
      const country = COUNTRIES.find((c) => c.code === event.country);
      return country ? ((country as Record<string, string>)[locale] || country.en) : event.country;
    })()
    : '';
  const isSystem = !!event.is_system;
  // System events only use 'going' status — ignore interested for display
  const initialStatus: AttendanceStatus = initialGoing
    ? 'going'
    : initialWait
      ? 'waitlist'
      : (!isSystem && initialInterested)
        ? 'interested'
        : 'none';
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);
  const going = status === 'going';
  const onWaitlist = status === 'waitlist';
  const [favorited, setFavorited] = useState(initialFav || false);
  const [goingCount, setGoingCount] = useState(event.going_count);
  const languageLabels = (event.languages || [])
    .map((code) => {
      const language = LANGUAGES.find((item) => item.code === code);
      return language
        ? ((language as Record<string, string>)[locale] || language.en)
        : code;
    })
    .slice(0, 2);

  const spotsLeft = event.max_attendees ? event.max_attendees - goingCount : null;
  const isFull = event.max_attendees != null && (spotsLeft ?? 0) <= 0;
  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || event.category_slug || '';
  const socialCue = isSystem
    ? t('cueAfisha')
    : goingCount >= 12
      ? t('cuePopular')
      : goingCount >= 4
        ? t('cueEasy')
        : tDetail('firstCue');

  async function handleToggleGoing(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    const prev = status;
    const optimistic: AttendanceStatus =
      prev === 'none' ? (isFull ? 'waitlist' : 'going') : 'none';
    setStatus(optimistic);
    if (prev === 'going' && optimistic === 'none') {
      setGoingCount((c) => c - 1);
    } else if (prev === 'none' && optimistic === 'going') {
      setGoingCount((c) => c + 1);
    }

    const result = await toggleAttendance(event.id);
    if (result.error) {
      setStatus(prev);
      if (prev === 'going' && optimistic === 'none') setGoingCount((c) => c + 1);
      else if (prev === 'none' && optimistic === 'going') setGoingCount((c) => c - 1);
      return;
    }
    const next = result.status ?? 'none';
    setStatus(next);
    // Reconcile going count if server chose different outcome than optimistic.
    if (next === 'going' && optimistic !== 'going') setGoingCount((c) => c + 1);
    else if (next !== 'going' && optimistic === 'going') setGoingCount((c) => c - 1);

    if (next === 'going') toast.success(tDetail('registeredForEvent'));
    else if (next === 'waitlist') toast.success(tDetail('addedToWaitlist'));
    else toast.success(tDetail('cancelledAttendance'));
  }



  function getRelativeTime(dateStr: string): string | null {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) return null;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return t('startingSoon');
    if (diffH < 24) return t('inHours', { count: diffH });
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return t('tomorrow');
    if (diffD < 7) return t('inDays', { count: diffD });
    return null;
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    const prev = favorited;
    setFavorited(!prev);

    const result = await toggleFavorite(event.id);
    if (result.error) {
      setFavorited(prev);
    } else {
      toast.success(result.favorited ? tDetail('addedToFavorites') : tDetail('removedFromFavorites'));
    }
  }

  return (
    <Link href={`/events/${event.id}`} className="block h-full">
      <Card className="group flex h-[24rem] flex-col gap-0 overflow-hidden rounded-3xl border-border/50 pt-0 pb-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* Cover — ~55% of card */}
        <div className="relative h-52 overflow-hidden">
          {event.photos[0] ? (
            <img
              src={event.photos[0]}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="bg-muted flex h-full items-center justify-center">
              <Calendar className="text-muted-foreground/30 h-16 w-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
          {event.description && (
            <div className="absolute inset-x-3 bottom-14 rounded-2xl bg-black/55 p-3 text-sm leading-relaxed text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <p className="line-clamp-4">{event.description}</p>
            </div>
          )}
          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {isSystem && (
              <Badge className="bg-amber-500/95 text-white backdrop-blur-md hover:bg-amber-500">
                <Sparkles className="mr-1 h-3 w-3" />
                {t('badgeAfisha')}
              </Badge>
            )}
            {event.is_free ? (
              <Badge className="bg-success/90 text-success-foreground backdrop-blur-md hover:bg-success">{t('free')}</Badge>
            ) : (
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-md">
                {event.price} {event.currency}
              </Badge>
            )}
            {event.is_online && (
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-md">
                <Globe className="mr-1 h-3 w-3" />
                {t('online')}
              </Badge>
            )}
            {(() => {
              const rel = getRelativeTime(event.starts_at);
              return rel ? (
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-xs font-medium">
                  {rel}
                </Badge>
              ) : null;
            })()}
          </div>
          {/* Favorite + share overlay */}
          {isAuthenticated && (
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                onClick={handleToggleFavorite}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-md transition-transform hover:scale-110"
              >
                <Heart
                  className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                />
              </button>
            </div>
          )}
          <div className="absolute right-3 bottom-3 left-3">
            <div className="inline-flex max-w-full items-center rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {socialCue}
            </div>
          </div>
        </div>

        {/* Content — compact */}
        <div className="flex flex-1 flex-col p-4">
          {/* Category + attendees row */}
          <div className="mb-2.5 flex items-center justify-between gap-3">
            {categoryLabel ? (
              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-xs font-medium">
                {categoryLabel}
              </Badge>
            ) : (
              <span />
            )}
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <Users className="h-3.5 w-3.5" />
              <span>{goingCount}</span>
              {!isSystem && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                  {t('spotsLeft', { count: spotsLeft })}
                </Badge>
              )}
              {!isSystem && spotsLeft !== null && spotsLeft <= 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                  {t('noSpotsLeft')}
                </Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight">{event.title}</h3>

          {/* Date + Location in one row */}
          <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(event.starts_at, locale)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              {event.is_online ? (
                <>
                  <Globe className="h-4 w-4 shrink-0" />
                  {t('online')}
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{cityLabel || countryDisplay}</span>
                </>
              )}
            </span>
          </div>
          {(languageLabels.length > 0 || (event.safety_tags && event.safety_tags.length > 0)) && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {languageLabels.map((language) => (
                <Badge
                  key={language}
                  variant="outline"
                  className="border-border/70 bg-background/70 text-[11px] font-medium"
                >
                  {language}
                </Badge>
              ))}
              <SafetyTagBadges tags={event.safety_tags} compact max={3} />
            </div>
          )}
          {/* <p className="mb-4 text-sm text-muted-foreground">
            {goingCount > 0 ? t('alreadyIn', { count: goingCount }) : t('firstToJoin')}
          </p> */}

          {friendsGoing && friendsGoing.length > 0 && (
            <FriendsGoingCue friends={friendsGoing} variant="card" className="mb-2" />
          )}

          {isAuthenticated && (
            <div className="mt-auto flex justify-end">
              <Button
                size="sm"
                variant={going || onWaitlist ? 'secondary' : 'default'}
                className="w-full rounded-xl font-semibold"
                onClick={handleToggleGoing}
              >
                {going
                  ? t('going')
                  : onWaitlist
                    ? t('onWaitlist')
                    : isSystem
                      ? t('join')
                      : isFull
                        ? t('joinWaitlist')
                        : t('join')}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
