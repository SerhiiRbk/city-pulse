'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './calendar-view';
import { CalendarSubscribeCard } from '@/components/events/calendar-subscribe-card';
import { getCalendarEvents, getMyCalendarEvents } from '@/lib/actions/calendar';

export interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  is_online: boolean;
  is_free: boolean;
  going_count: number;
  category_id: string | null;
  photos: string[] | null;
}

interface CalendarPageClientProps {
  initialEvents: CalendarEvent[];
  initialMyEvents: CalendarEvent[];
  initialYear: number;
  initialMonth: number;
  isAuthenticated: boolean;
  /** Personal feed token; null when the user is not authenticated. */
  calendarToken: string | null;
  /** Absolute origin used to build the subscribe URL. */
  siteUrl: string;
}

interface MonthBundle {
  all: CalendarEvent[];
  my: CalendarEvent[];
  /** Wall-clock ms of the last successful fetch for this bundle. */
  fetchedAt: number;
}

/**
 * How long a cached month bundle is considered fresh. After this window,
 * a navigation to that month still renders instantly from cache (no
 * loading flash) but kicks off a background re-fetch to pull in any
 * events the user might have missed since the last visit.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const monthKey = (y: number, m: number) => `${y}-${m.toString().padStart(2, '0')}`;

function isFresh(bundle: MonthBundle | undefined): bundle is MonthBundle {
  return !!bundle && Date.now() - bundle.fetchedAt < CACHE_TTL_MS;
}

function shiftMonth(year: number, month: number, delta: number) {
  // Normalises month overflow into the next/previous year, preserving the
  // 1-12 month convention used everywhere else on this page.
  const total = year * 12 + (month - 1) + delta;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

export function CalendarPageClient({
  initialEvents,
  initialMyEvents,
  initialYear,
  initialMonth,
  isAuthenticated,
  calendarToken,
  siteUrl,
}: CalendarPageClientProps) {
  const t = useTranslations('calendar');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEvents);
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>(initialMyEvents);
  const [tab, setTab] = useState('all');

  // Cross-month cache. The initial month is seeded from server data with
  // mount time as `fetchedAt` so the first navigation home is instant
  // and the bundle starts the TTL clock from when the user actually saw
  // the page. Stored in a ref so updates don't trigger re-renders.
  const cacheRef = useRef<Map<string, MonthBundle>>(
    new Map([
      [
        monthKey(initialYear, initialMonth),
        {
          all: initialEvents,
          my: initialMyEvents,
          fetchedAt: Date.now(),
        },
      ],
    ]),
  );
  // Tracks the keys of in-flight requests so we don't fire duplicate
  // fetches. Entries are removed in `finally` so a stale bundle becomes
  // re-fetchable once a request completes — that's what enables the
  // stale-while-revalidate behaviour on top of the TTL.
  const inflightRef = useRef<Set<string>>(new Set());
  // Shadow refs for the focused month — used so background revalidations
  // can decide whether to flush their result into visible state.
  const focusRef = useRef({ year: initialYear, month: initialMonth });
  focusRef.current = { year, month };

  const fetchInto = useCallback(
    async (y: number, m: number, focus: boolean) => {
      const key = monthKey(y, m);
      const cached = cacheRef.current.get(key);

      // Always paint from cache when the user is *navigating* to this
      // month — even if it's stale. The fresh data lands a moment later
      // and the user never sees a flash of empty grid.
      if (focus && cached) {
        setAllEvents(cached.all);
        setMyEvents(cached.my);
      }

      // De-dupe: someone else is already fetching this key. Any cache
      // we had has already been painted above (if focused).
      if (inflightRef.current.has(key)) return;

      // Cache hit + fresh → nothing to do. We've already painted (when
      // focused) and a prefetch shouldn't re-fetch fresh data.
      if (isFresh(cached)) return;

      inflightRef.current.add(key);
      try {
        const [all, my] = await Promise.all([
          getCalendarEvents(y, m),
          isAuthenticated ? getMyCalendarEvents(y, m) : Promise.resolve([]),
        ]);
        const bundle: MonthBundle = {
          all: all as CalendarEvent[],
          my: my as CalendarEvent[],
          fetchedAt: Date.now(),
        };
        cacheRef.current.set(key, bundle);

        // Only flush to visible state if the user is still looking at
        // this month. A background prefetch or revalidation must not
        // yank the displayed grid out from under them.
        const stillFocused =
          focusRef.current.year === y && focusRef.current.month === m;
        if (stillFocused) {
          setAllEvents(bundle.all);
          setMyEvents(bundle.my);
        }
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [isAuthenticated],
  );

  const handleNavigate = useCallback(
    (y: number, m: number) => {
      setYear(y);
      setMonth(m);
      // fetchInto handles the four cases (fresh hit, stale hit, miss,
      // already in-flight) coherently — including instant paint from
      // cache and stale-while-revalidate.
      void fetchInto(y, m, true);
    },
    [fetchInto],
  );

  // Whenever the focused month settles, warm up the two neighbours in
  // the background. Cheap (≤2 select queries) and covers ~95% of
  // back-and-forth navigation.
  useEffect(() => {
    const prev = shiftMonth(year, month, -1);
    const next = shiftMonth(year, month, +1);
    void fetchInto(prev.y, prev.m, false);
    void fetchInto(next.y, next.m, false);
  }, [year, month, fetchInto]);

  const showSubscribe = isAuthenticated && calendarToken;

  if (!isAuthenticated) {
    return (
      <CalendarView
        events={allEvents}
        year={year}
        month={month}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="space-y-8">
      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto self-start rounded-full bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-full px-4 py-1.5 text-sm">
              {t('allEvents')}
            </TabsTrigger>
            <TabsTrigger value="my" className="rounded-full px-4 py-1.5 text-sm">
              {t('myEvents')}
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground sm:max-w-sm sm:text-right">
            {tab === 'all' ? t('allEventsHint') : t('myEventsHint')}
          </p>
        </div>

        <TabsContent value="all" className="mt-0">
          <CalendarView
            events={allEvents}
            year={year}
            month={month}
            onNavigate={handleNavigate}
          />
        </TabsContent>
        <TabsContent value="my" className="mt-0">
          <CalendarView
            events={myEvents}
            year={year}
            month={month}
            onNavigate={handleNavigate}
          />
        </TabsContent>
      </Tabs>

      {showSubscribe && (
        <CalendarSubscribeCard
          initialToken={calendarToken}
          origin={siteUrl}
        />
      )}
    </div>
  );
}
