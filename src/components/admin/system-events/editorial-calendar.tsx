'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { rescheduleSystemEvent } from '@/lib/actions/system-events-editorial';

export interface EditorialCalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  editorial_status: string;
  status: string;
}

interface EditorialCalendarProps {
  anchorIso: string;
  events: EditorialCalendarEvent[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-muted-foreground/40',
  review: 'bg-amber-500',
  scheduled: 'bg-sky-500',
  published: 'bg-emerald-500',
};

/**
 * Lightweight month grid (no external calendar dep). The day cells are
 * drop targets; dragging an event row updates `starts_at` to the new day
 * while preserving the original time-of-day. Optimistic UI moves the
 * event into the new cell immediately and rolls back on error.
 */
export function EditorialCalendar({ anchorIso, events }: EditorialCalendarProps) {
  const t = useTranslations('admin.systemEvents.calendar');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);

  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);

  // Apply optimistic moves so dragging feels instantaneous.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EditorialCalendarEvent[]>();
    for (const ev of events) {
      const startsAt = optimistic[ev.id] ?? ev.starts_at;
      const key = dayKey(new Date(startsAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...ev, starts_at: startsAt });
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return map;
  }, [events, optimistic]);

  function navigateMonth(delta: number) {
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + delta);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    const params = new URLSearchParams(searchParams);
    params.set('month', key);
    router.push(`?${params.toString()}`);
  }

  function handleDrop(targetDayKey: string, eventId: string | null) {
    if (!eventId) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;

    const original = new Date(ev.starts_at);
    const [y, m, d] = targetDayKey.split('-').map(Number);
    const next = new Date(original);
    next.setFullYear(y, m - 1, d);
    if (next.toISOString() === ev.starts_at) return;

    const newIso = next.toISOString();
    setOptimistic((prev) => ({ ...prev, [eventId]: newIso }));

    startTransition(async () => {
      const res = await rescheduleSystemEvent(eventId, newIso);
      if ('error' in res && res.error) {
        setOptimistic((prev) => {
          const copy = { ...prev };
          delete copy[eventId];
          return copy;
        });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth(-1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('prevMonth')}
        </Button>
        {pending && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('saving')}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth(1)}
        >
          {t('nextMonth')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs">
        {weekdayHeaders().map((label) => (
          <div
            key={label}
            className="bg-muted/40 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide"
          >
            {label}
          </div>
        ))}

        {grid.map((day) => {
          const key = dayKey(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const today = isSameDay(day, new Date());
          const dayEvents = eventsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(key, e.dataTransfer.getData('text/plain'));
              }}
              className={`min-h-[120px] bg-background p-2 transition-colors ${
                inMonth ? '' : 'opacity-50'
              } ${draggingId ? 'hover:bg-primary/5' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span
                  className={`${
                    today
                      ? 'rounded-full bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/admin/system-events/composer/${ev.id}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(ev.id);
                      e.dataTransfer.setData('text/plain', ev.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className="flex cursor-grab items-center gap-1.5 truncate rounded-md border bg-card px-2 py-1 text-[11px] hover:bg-muted/40 active:cursor-grabbing"
                    title={ev.title}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        STATUS_DOT[ev.editorial_status] ?? 'bg-muted-foreground/40'
                      }`}
                    />
                    <span className="truncate">{ev.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthGrid(anchor: Date): Date[] {
  // Always render 6 rows × 7 cols so the layout doesn't jump month-to-month.
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // shift so Monday is index 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(start.getTime() + i * DAY_MS));
  }
  return days;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function weekdayHeaders(): string[] {
  // Locale-aware (Mon → Sun) labels using short weekday names.
  const ref = new Date(2024, 0, 1); // Mon Jan 1, 2024
  const labels: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(ref.getTime() + i * DAY_MS);
    labels.push(
      d.toLocaleDateString(undefined, { weekday: 'short' }),
    );
  }
  return labels;
}
