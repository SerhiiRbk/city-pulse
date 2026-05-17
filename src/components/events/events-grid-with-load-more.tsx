'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { EventCard } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { loadMoreEvents, type LoadMoreFilters } from '@/lib/actions/events-load-more';
import type { FriendGoing } from '@/lib/actions/friends-going';

export interface EventItem {
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
  public_crew_count?: number;
}

interface EventsGridWithLoadMoreProps {
  initialEvents: EventItem[];
  initialGoingSet: string[];
  initialWaitlistSet: string[];
  initialInterestedSet: string[];
  initialFavoritedSet: string[];
  initialFriendsGoing: Record<string, FriendGoing[]>;
  isAuthenticated: boolean;
  filters: LoadMoreFilters;
  pageSize: number;
  /** Show a dynamic event count heading above the grid. */
  showCount?: boolean;
}

export function EventsGridWithLoadMore({
  initialEvents,
  initialGoingSet,
  initialWaitlistSet,
  initialInterestedSet,
  initialFavoritedSet,
  initialFriendsGoing,
  isAuthenticated,
  filters,
  pageSize,
  showCount,
}: EventsGridWithLoadMoreProps) {
  const t = useTranslations('common');
  const tPage = useTranslations('events.page');
  const locale = useLocale();
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [goingSet, setGoingSet] = useState<Set<string>>(new Set(initialGoingSet));
  const [waitlistSet, setWaitlistSet] = useState<Set<string>>(new Set(initialWaitlistSet));
  const [interestedSet, setInterestedSet] = useState<Set<string>>(new Set(initialInterestedSet));
  const [favoritedSet, setFavoritedSet] = useState<Set<string>>(new Set(initialFavoritedSet));
  const [friendsGoing, setFriendsGoing] = useState<Record<string, FriendGoing[]>>(initialFriendsGoing);
  const [hasMore, setHasMore] = useState(initialEvents.length >= pageSize);
  const [isPending, startTransition] = useTransition();

  // Reset state when server re-renders with new data (e.g. filter change).
  // We use the first event ID as a fingerprint — if it changes, the dataset
  // is different and we need to sync.
  const fingerprint = initialEvents.map((e) => e.id).join(',');
  useEffect(() => {
    setEvents(initialEvents);
    setGoingSet(new Set(initialGoingSet));
    setWaitlistSet(new Set(initialWaitlistSet));
    setInterestedSet(new Set(initialInterestedSet));
    setFavoritedSet(new Set(initialFavoritedSet));
    setFriendsGoing(initialFriendsGoing);
    setHasMore(initialEvents.length >= pageSize);
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadMoreEvents({
        ...filters,
        offset: events.length,
        limit: pageSize,
        locale,
      });

      if (!result) return;

      setEvents((prev) => [...prev, ...result.events]);
      setGoingSet((prev) => {
        const next = new Set(prev);
        result.goingIds.forEach((id) => next.add(id));
        return next;
      });
      setWaitlistSet((prev) => {
        const next = new Set(prev);
        result.waitlistIds.forEach((id) => next.add(id));
        return next;
      });
      setInterestedSet((prev) => {
        const next = new Set(prev);
        result.interestedIds.forEach((id) => next.add(id));
        return next;
      });
      setFavoritedSet((prev) => {
        const next = new Set(prev);
        result.favoritedIds.forEach((id) => next.add(id));
        return next;
      });
      setFriendsGoing((prev) => ({ ...prev, ...result.friendsGoingByEvent }));
      setHasMore(result.events.length >= pageSize);
    });
  };

  return (
    <>
      {showCount && (
        <h2 className="mb-6 text-3xl font-bold tracking-tight">
          {tPage('resultsTitle', { count: events.length })}
        </h2>
      )}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isGoing={goingSet.has(event.id)}
            isWaitlisted={waitlistSet.has(event.id)}
            isInterested={interestedSet.has(event.id)}
            isFavorited={favoritedSet.has(event.id)}
            isAuthenticated={isAuthenticated}
            publicCrewCount={event.public_crew_count}
            friendsGoing={friendsGoing[event.id]}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isPending}
            variant="outline"
            size="lg"
            className="rounded-full px-8"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('showMore')}
              </>
            ) : (
              t('showMore')
            )}
          </Button>
        </div>
      )}
    </>
  );
}
