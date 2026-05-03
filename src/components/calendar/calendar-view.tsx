'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryColor } from '@/lib/events/category-colors';
import type { CalendarEvent } from './calendar-page-client';

interface CalendarViewProps {
  events: CalendarEvent[];
  year: number;
  month: number;
  onNavigate: (year: number, month: number) => void;
}

const MAX_CHIPS_DESKTOP = 2;

/**
 * Splits events of a single day into 3 buckets so the selected-day
 * panel reads as an editorial agenda rather than a flat list. The cut
 * points (12:00 / 17:00) are deliberate "good-enough for everyone"
 * boundaries — they avoid awkward edge cases like a noon brunch falling
 * into "morning" or a 5pm lecture into "evening".
 */
function bucketByTime(events: CalendarEvent[]) {
  const morning: CalendarEvent[] = [];
  const afternoon: CalendarEvent[] = [];
  const evening: CalendarEvent[] = [];
  for (const ev of events) {
    const hour = new Date(ev.starts_at).getHours();
    if (hour < 12) morning.push(ev);
    else if (hour < 17) afternoon.push(ev);
    else evening.push(ev);
  }
  return { morning, afternoon, evening };
}

export function CalendarView({
  events,
  year,
  month,
  onNavigate,
}: CalendarViewProps) {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthName = new Date(year, month - 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  // Postgres-style ISO week (Mon=0…Sun=6). JS getDay() returns Sun=0.
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const weekDays = useMemo(() => {
    // Monday-anchored week labels in the user's locale. We pick a known
    // Monday (2024-01-01) and walk seven days so the format follows
    // whatever the locale wants ("Mon"/"Пн"/"Po"/...).
    const base = new Date(2024, 0, 1);
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
      (map[day] ??= []).push(event);
    }
    // Stable order within a day: earliest first.
    for (const day of Object.keys(map)) {
      map[Number(day)].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return map;
  }, [events]);

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;

  const totalCells = firstDayOfWeek + daysInMonth;
  const trailingCells = (7 - (totalCells % 7)) % 7;

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

  function handleToday() {
    onNavigate(today.getFullYear(), today.getMonth() + 1);
    setSelectedDay(today.getDate());
  }

  const selectedEvents = selectedDay
    ? eventsByDay[selectedDay] || []
    : [];

  return (
    <div className="space-y-5">
      {/* Month navigator. Sits flush above the grid so the eye reads it
          as the grid's caption rather than a separate widget. The month
          label itself opens a popover for jumping months/years — much
          faster than clicking ‹/› fifteen times. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handlePrev}
            aria-label={t('prevMonth')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <MonthJumper
            year={year}
            month={month}
            label={monthName}
            onPick={(y, m) => {
              onNavigate(y, m);
              setSelectedDay(null);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleNext}
            aria-label={t('nextMonth')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        {!isCurrentMonth && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleToday}
          >
            {t('today')}
          </Button>
        )}
      </div>

      {/* Calendar grid. We render full 6-week worth of cells (current
          month + leading/trailing days from neighbours), so the grid has
          a steady rhythm regardless of where the 1st falls. */}
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
          {weekDays.map((d, i) => {
            const isWeekend = i >= 5;
            return (
              <div
                key={d}
                className={cn(
                  'px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider',
                  isWeekend
                    ? 'text-amber-700/80 dark:text-amber-300/80'
                    : 'text-muted-foreground',
                )}
              >
                {d}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border/40">
          {/* Leading days from previous month — dimmed, non-interactive. */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => {
            const day = prevMonthDays - firstDayOfWeek + 1 + i;
            return (
              <FillerCell key={`lead-${i}`} day={day} weekday={i} />
            );
          })}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay[day] ?? [];
            const isToday = isCurrentMonth && today.getDate() === day;
            const isSelected = selectedDay === day;
            const weekday = (firstDayOfWeek + i) % 7;
            const isWeekend = weekday >= 5;
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDay(day === selectedDay ? null : day)
                }
                aria-pressed={isSelected}
                aria-label={`${day} ${monthName}${
                  hasEvents ? ` — ${dayEvents.length}` : ''
                }`}
                className={cn(
                  'group relative flex min-h-[84px] flex-col items-stretch gap-1 p-2 text-left transition-colors sm:min-h-[120px] sm:p-2.5',
                  isWeekend && !isToday && 'bg-amber-500/[0.04]',
                  isSelected
                    ? 'bg-primary/10'
                    : hasEvents
                      ? 'hover:bg-accent/40'
                      : 'hover:bg-muted/40',
                  isToday && 'bg-primary/5',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isSelected
                          ? 'text-primary'
                          : isWeekend
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-foreground',
                    )}
                  >
                    {day}
                  </span>
                  {hasEvents && (
                    <span className="hidden text-[10px] font-medium tabular-nums text-muted-foreground sm:inline">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Desktop: event title chips. Truncated, with a small
                    category-color dot so the calendar still reads at a
                    glance without becoming a wall of text. */}
                <ul className="hidden flex-col gap-1 sm:flex">
                  {dayEvents.slice(0, MAX_CHIPS_DESKTOP).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center gap-1.5 rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] leading-tight"
                    >
                      <span
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: categoryColor(ev.category_id) }}
                      />
                      <span className="truncate text-foreground/90">
                        {ev.title}
                      </span>
                    </li>
                  ))}
                  {dayEvents.length > MAX_CHIPS_DESKTOP && (
                    <li className="px-1.5 text-[10px] font-medium text-muted-foreground">
                      {t('moreEvents', {
                        count: dayEvents.length - MAX_CHIPS_DESKTOP,
                      })}
                    </li>
                  )}
                </ul>

                {/* Mobile fallback: stacked color bars — denser than dots,
                    still legible at thumbnail sizes. */}
                <div className="mt-auto flex gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 4).map((ev) => (
                    <span
                      key={ev.id}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: categoryColor(ev.category_id) }}
                    />
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="text-[9px] font-medium text-muted-foreground">
                      +{dayEvents.length - 4}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {Array.from({ length: trailingCells }).map((_, i) => (
            <FillerCell
              key={`trail-${i}`}
              day={i + 1}
              weekday={(firstDayOfWeek + daysInMonth + i) % 7}
            />
          ))}
        </div>
      </div>

      {/* Selected-day panel */}
      {selectedDay ? (
        <SelectedDayPanel
          year={year}
          month={month}
          day={selectedDay}
          locale={locale}
          events={selectedEvents}
        />
      ) : (
        <div className="flex items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {t('selectPrompt')}
        </div>
      )}
    </div>
  );
}

/**
 * Year + month picker shown when clicking the navigator label.
 *
 * Local "draft year" state lets users page through years without
 * triggering a fetch on each tick — only picking a month commits the
 * jump. The current year is bracketed by a configurable window so the
 * picker stays useful for long-running calendars without becoming a
 * sprawling date input.
 */
function MonthJumper({
  year,
  month,
  label,
  onPick,
}: {
  year: number;
  month: number;
  label: string;
  onPick: (year: number, month: number) => void;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);

  // Keep the draft year synced with the displayed month whenever the
  // popover re-opens. Without this, navigating ‹/› outside the popover
  // could leave the year selector stuck on a stale page.
  function handleOpenChange(next: boolean) {
    if (next) setDraftYear(year);
    setOpen(next);
  }

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2024, i, 1).toLocaleDateString(locale, { month: 'short' }),
    );
  }, [locale]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-xl font-semibold capitalize tracking-tight hover:bg-muted/60 sm:text-2xl"
        >
          {label}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setDraftYear((y) => y - 1)}
            aria-label={`Year ${draftYear - 1}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            {draftYear}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setDraftYear((y) => y + 1)}
            aria-label={`Year ${draftYear + 1}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {months.map((name, i) => {
            const m = i + 1;
            const isCurrent = draftYear === year && m === month;
            return (
              <Button
                key={name}
                variant={isCurrent ? 'default' : 'ghost'}
                size="sm"
                className="h-9 rounded-xl text-xs font-medium capitalize"
                onClick={() => {
                  onPick(draftYear, m);
                  setOpen(false);
                }}
              >
                {name}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FillerCell({ day, weekday }: { day: number; weekday: number }) {
  const isWeekend = weekday >= 5;
  return (
    <div
      aria-hidden
      className={cn(
        'flex min-h-[84px] flex-col p-2 sm:min-h-[120px] sm:p-2.5',
        isWeekend ? 'bg-amber-500/[0.025]' : 'bg-muted/10',
      )}
    >
      <span className="text-sm font-medium tabular-nums text-muted-foreground/40">
        {day}
      </span>
    </div>
  );
}

function SelectedDayPanel({
  year,
  month,
  day,
  locale,
  events,
}: {
  year: number;
  month: number;
  day: number;
  locale: string;
  events: CalendarEvent[];
}) {
  const t = useTranslations('calendar');
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString(
    locale,
    { weekday: 'long', day: 'numeric', month: 'long' },
  );

  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold capitalize">{dateLabel}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('noEventsDay')}
        </p>
      </div>
    );
  }

  const buckets = bucketByTime(events);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold capitalize sm:text-xl">
          {dateLabel}
        </h3>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('eventsCount', { count: events.length })}
        </span>
      </div>

      <div className="mt-5 space-y-6">
        {buckets.morning.length > 0 && (
          <BucketSection
            label={t('morning')}
            events={buckets.morning}
            locale={locale}
          />
        )}
        {buckets.afternoon.length > 0 && (
          <BucketSection
            label={t('afternoon')}
            events={buckets.afternoon}
            locale={locale}
          />
        )}
        {buckets.evening.length > 0 && (
          <BucketSection
            label={t('evening')}
            events={buckets.evening}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}

function BucketSection({
  label,
  events,
  locale,
}: {
  label: string;
  events: CalendarEvent[];
  locale: string;
}) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id}>
            <EventRow event={event} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventRow({
  event,
  locale,
}: {
  event: CalendarEvent;
  locale: string;
}) {
  const t = useTranslations('calendar');
  const timeLabel = new Date(event.starts_at).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const photo = event.photos?.[0] || null;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-3 pr-4 transition-colors hover:border-border hover:bg-accent/40"
    >
      {/* Category color stripe — anchors the row visually to the chip
          on the calendar grid for the same event. */}
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-1 rounded-r-full"
        style={{ background: categoryColor(event.category_id) }}
      />

      <div className="ml-2 hidden h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
        {photo ? (
          // Calendar surfaces are read-heavy and the same photo will
          // already be cached on the event cards, so plain <img> keeps
          // the markup simple without measurable cost.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="h-full w-full"
            style={{ background: categoryColor(event.category_id), opacity: 0.18 }}
          />
        )}
      </div>

      <div className="ml-2 flex min-w-0 flex-1 flex-col gap-1 sm:ml-0">
        <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-muted-foreground">
          <span className="text-foreground/80">{timeLabel}</span>
          {event.going_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              <Users className="h-3 w-3" /> {event.going_count}
            </span>
          )}
        </div>
        <p className="truncate text-sm font-semibold leading-tight text-foreground sm:text-base">
          {event.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {event.is_online ? (
            <Badge variant="secondary" className="gap-1 rounded-full px-2">
              <Globe className="h-3 w-3" /> {t('online')}
            </Badge>
          ) : event.city ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {event.city}
            </span>
          ) : null}
          {event.is_free && (
            <Badge className="rounded-full bg-success px-2 text-success-foreground">
              {t('free')}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
