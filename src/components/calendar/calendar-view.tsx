'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  is_online: boolean;
  is_free: boolean;
  going_count: number;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  year: number;
  month: number;
  onNavigate: (year: number, month: number) => void;
}

export function CalendarView({ events, year, month, onNavigate }: CalendarViewProps) {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthName = new Date(year, month - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday start

  const weekDays = useMemo(() => {
    const base = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const event of events) {
      const day = new Date(event.starts_at).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(event);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  function handlePrev() {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    onNavigate(y, m);
    setSelectedDay(null);
  }

  function handleNext() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    onNavigate(y, m);
    setSelectedDay(null);
  }

  return (
    <div>
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold capitalize">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-muted-foreground pb-2 text-center text-xs font-medium uppercase">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day];
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day === selectedDay ? null : day)}
              className={cn(
                'relative flex min-h-[60px] flex-col items-center rounded-lg border p-1 text-sm transition-colors sm:min-h-[80px]',
                isToday && 'border-primary bg-primary/5',
                isSelected && 'ring-primary ring-2',
                dayEvents ? 'cursor-pointer hover:bg-accent' : 'cursor-default',
              )}
            >
              <span className={cn('font-medium', isToday && 'text-primary')}>{day}</span>
              {dayEvents && (
                <div className="mt-auto flex flex-wrap justify-center gap-0.5">
                  {dayEvents.length <= 3 ? (
                    dayEvents.map((_, j) => (
                      <div key={j} className="bg-primary h-1.5 w-1.5 rounded-full" />
                    ))
                  ) : (
                    <span className="text-primary text-[10px] font-semibold">{dayEvents.length}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold">
            {new Date(year, month - 1, selectedDay).toLocaleDateString(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events</p>
          ) : (
            selectedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(event.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {event.is_online ? (
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="mr-1 h-3 w-3" /> Online
                    </Badge>
                  ) : event.city ? (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" /> {event.city}
                    </span>
                  ) : null}
                  {event.is_free && <Badge className="bg-success text-xs text-success-foreground">Free</Badge>}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
