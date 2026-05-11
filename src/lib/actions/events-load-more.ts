'use server';

import { getEvents, getUserEventStatuses } from '@/lib/actions/events';
import { getUser } from '@/lib/actions/auth';
import { getFriendsGoingBulk } from '@/lib/actions/friends-going';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { resolveEventTitle, resolveEventDescription } from '@/lib/event-i18n';
import type { EventSort } from '@/lib/actions/events';
import type { FriendGoing } from '@/lib/actions/friends-going';

export interface LoadMoreFilters {
  country?: string;
  city?: string;
  city_id?: string;
  categories?: string[];
  languages?: string[];
  date_from?: string;
  date_to?: string;
  is_free?: boolean;
  is_online?: boolean;
  is_system?: boolean;
  q?: string;
  safety_tags?: string[];
  sort?: EventSort;
  include_past?: boolean;
}

interface LoadMoreParams extends LoadMoreFilters {
  offset: number;
  limit: number;
  locale?: string;
}

interface LoadMoreResult {
  events: Array<{
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
  }>;
  goingIds: string[];
  waitlistIds: string[];
  interestedIds: string[];
  favoritedIds: string[];
  friendsGoingByEvent: Record<string, FriendGoing[]>;
}

export async function loadMoreEvents(params: LoadMoreParams): Promise<LoadMoreResult | null> {
  const { offset, limit, locale, ...filters } = params;

  const events = await getEvents({
    ...filters,
    limit,
    offset,
  });

  if (!events || events.length === 0) {
    return { events: [], goingIds: [], waitlistIds: [], interestedIds: [], favoritedIds: [], friendsGoingByEvent: {} };
  }

  // Resolve localized titles/descriptions if locale is provided
  const localizedEvents = locale
    ? events.map((e) => ({
        ...e,
        title: resolveEventTitle(e, locale),
        description: resolveEventDescription(e, locale) ?? e.description,
      }))
    : events;

  const user = await getUser();
  const eventIds = events.map((e) => e.id);

  const { goingSet, waitlistSet, interestedSet, favoritedSet } = user
    ? await getUserEventStatuses(eventIds)
    : {
        goingSet: new Set<string>(),
        waitlistSet: new Set<string>(),
        interestedSet: new Set<string>(),
        favoritedSet: new Set<string>(),
      };

  const friendsGoingByEvent: Record<string, FriendGoing[]> =
    user && (await isFeatureEnabled('friends_going', user.id))
      ? await getFriendsGoingBulk(eventIds)
      : {};

  return {
    events: localizedEvents,
    goingIds: Array.from(goingSet),
    waitlistIds: Array.from(waitlistSet),
    interestedIds: Array.from(interestedSet),
    favoritedIds: Array.from(favoritedSet),
    friendsGoingByEvent,
  };
}
