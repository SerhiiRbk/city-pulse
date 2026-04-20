'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { EventsMapMarker } from '@/lib/actions/events-map';
import { categoryColor, categoryHalo } from '@/lib/events/category-colors';
import { MapPin, Users } from 'lucide-react';

type LegendItem = {
  id: string;
  name: string;
  count: number;
};

type EventsMapSidebarProps = {
  markers: EventsMapMarker[];
  hoveredId: string | null;
  selectedCategoryIds: string[];
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onToggleCategory: (id: string) => void;
  className?: string;
};

const LEGEND_VISIBLE = 6;

export function EventsMapSidebar({
  markers,
  hoveredId,
  selectedCategoryIds,
  onHover,
  onSelect,
  onToggleCategory,
  className,
}: EventsMapSidebarProps) {
  const t = useTranslations('events.map');
  const tCard = useTranslations('events.card');
  const locale = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  const legend = useMemo<LegendItem[]>(() => {
    const map = new Map<string, LegendItem>();
    for (const event of markers) {
      if (!event.category_id) continue;
      const existing = map.get(event.category_id);
      if (existing) {
        existing.count += 1;
      } else {
        const name =
          event.category_translations?.[locale] ||
          event.category_translations?.en ||
          event.category_slug ||
          '';
        if (!name) continue;
        map.set(event.category_id, {
          id: event.category_id,
          name,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [markers, locale]);

  const visibleLegend = legendExpanded ? legend : legend.slice(0, LEGEND_VISIBLE);
  const selectedSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  const sorted = useMemo(
    () =>
      [...markers].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [markers],
  );

  // Scroll the hovered card into view whenever hoveredId changes from map interactions.
  useEffect(() => {
    if (!hoveredId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-event-id="${hoveredId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hoveredId]);

  return (
    <aside className={className}>
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium">
          {markers.length === 0
            ? t('sidebarEmpty')
            : t('sidebarCount', { count: markers.length })}
        </p>
        {markers.length > 0 && (
          <p className="text-xs text-muted-foreground">{t('sidebarHint')}</p>
        )}

        {legend.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('legendTitle')}
              </p>
              {legend.length > LEGEND_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setLegendExpanded((v) => !v)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {legendExpanded
                    ? t('legendCollapse')
                    : t('legendShowMore', {
                        count: legend.length - LEGEND_VISIBLE,
                      })}
                </button>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {visibleLegend.map((item) => {
                const active = selectedSet.has(item.id);
                const color = categoryColor(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleCategory(item.id)}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors ' +
                      (active
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-border/70 bg-background hover:bg-muted')
                    }
                    style={
                      active
                        ? { background: color, borderColor: color }
                        : undefined
                    }
                    aria-pressed={active}
                  >
                    <span
                      aria-hidden
                      className={
                        'inline-block h-2 w-2 rounded-full ' +
                        (active ? 'bg-white/90' : '')
                      }
                      style={!active ? { background: color } : undefined}
                    />
                    <span className="max-w-[9rem] truncate">{item.name}</span>
                    <span className={active ? 'opacity-90' : 'text-muted-foreground'}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-2 py-2"
        onMouseLeave={() => onHover(null)}
      >
        {sorted.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <p>{t('empty')}</p>
            <p className="text-xs">{t('emptyHint')}</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((event) => {
              const color = categoryColor(event.category_id);
              const halo = categoryHalo(event.category_id);
              const categoryName =
                event.category_translations?.[locale] ||
                event.category_translations?.en ||
                event.category_slug ||
                '';
              const hovered = hoveredId === event.id;
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    data-event-id={event.id}
                    onClick={() => onSelect(event.id)}
                    onMouseEnter={() => onHover(event.id)}
                    onFocus={() => onHover(event.id)}
                    className={
                      'group block rounded-xl border p-2.5 transition-all ' +
                      (hovered
                        ? 'border-primary/60 bg-muted/70 shadow-sm'
                        : 'border-transparent hover:border-border hover:bg-muted/50')
                    }
                  >
                    <div className="flex gap-3">
                      <div
                        className="h-12 w-12 shrink-0 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${color}, ${halo})`,
                        }}
                        aria-hidden
                      >
                        {event.photos && event.photos.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.photos[0]}
                            alt=""
                            className="h-full w-full rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(event.starts_at))}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {event.city && <span className="truncate">{event.city}</span>}
                          {categoryName && (
                            <span
                              className="inline-flex items-center gap-1"
                              style={{ color }}
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: color }}
                                aria-hidden
                              />
                              {categoryName}
                            </span>
                          )}
                          {event.going_count > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              {event.going_count}
                            </span>
                          )}
                          {event.is_free && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              {tCard('free')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
