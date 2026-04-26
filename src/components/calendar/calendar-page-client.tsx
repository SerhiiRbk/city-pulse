'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './calendar-view';
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
}

export function CalendarPageClient({
  initialEvents,
  initialMyEvents,
  initialYear,
  initialMonth,
  isAuthenticated,
}: CalendarPageClientProps) {
  const t = useTranslations('calendar');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEvents);
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>(initialMyEvents);
  const [tab, setTab] = useState('all');

  const fetchEvents = useCallback(
    async (y: number, m: number) => {
      const [all, my] = await Promise.all([
        getCalendarEvents(y, m),
        isAuthenticated ? getMyCalendarEvents(y, m) : Promise.resolve([]),
      ]);
      setAllEvents(all as CalendarEvent[]);
      setMyEvents(my as CalendarEvent[]);
    },
    [isAuthenticated],
  );

  function handleNavigate(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  useEffect(() => {
    if (year !== initialYear || month !== initialMonth) {
      fetchEvents(year, month);
    }
  }, [year, month, initialYear, initialMonth, fetchEvents]);

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
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      {/* Lighter tab strip than before: no wrapping card so the focus
          stays on the calendar grid below. The contextual hint sits to
          the right of the tabs on desktop, under them on mobile. */}
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
  );
}
