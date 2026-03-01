'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './calendar-view';
import { getCalendarEvents, getMyCalendarEvents } from '@/lib/actions/calendar';

interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  is_online: boolean;
  is_free: boolean;
  going_count: number;
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

  const fetchEvents = useCallback(async (y: number, m: number) => {
    const [all, my] = await Promise.all([
      getCalendarEvents(y, m),
      isAuthenticated ? getMyCalendarEvents(y, m) : Promise.resolve([]),
    ]);
    setAllEvents(all);
    setMyEvents(my);
  }, [isAuthenticated]);

  function handleNavigate(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  useEffect(() => {
    if (year !== initialYear || month !== initialMonth) {
      fetchEvents(year, month);
    }
  }, [year, month, initialYear, initialMonth, fetchEvents]);

  return (
    <div>
      {isAuthenticated ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">{t('allEvents')}</TabsTrigger>
            <TabsTrigger value="my">{t('myEvents')}</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <CalendarView
              events={allEvents}
              year={year}
              month={month}
              onNavigate={handleNavigate}
            />
          </TabsContent>
          <TabsContent value="my">
            <CalendarView
              events={myEvents}
              year={year}
              month={month}
              onNavigate={handleNavigate}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <CalendarView
          events={allEvents}
          year={year}
          month={month}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
