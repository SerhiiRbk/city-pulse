export type MapTimeRange = 'today' | 'tomorrow' | 'weekend' | 'week' | '2weeks';

export const MAP_TIME_RANGES: readonly MapTimeRange[] = [
  'today',
  'tomorrow',
  'weekend',
  'week',
  '2weeks',
] as const;

export const DEFAULT_MAP_TIME_RANGE: MapTimeRange = '2weeks';

export function isMapTimeRange(value: string | undefined | null): value is MapTimeRange {
  return !!value && (MAP_TIME_RANGES as readonly string[]).includes(value);
}

/**
 * Resolve a friendly time-range label into concrete [from, to] timestamps.
 *
 * "weekend" is a small UX wrinkle: during the working week it means
 * Fri 18:00 → Sun 23:59, but if the user is already on a weekend day we
 * start "from now" so we don't hide currently-running events.
 */
export function resolveMapTimeRange(
  range: MapTimeRange,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const DAY = 24 * 60 * 60 * 1000;

  switch (range) {
    case 'today': {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: now, to: end };
    }

    case 'tomorrow': {
      const start = new Date(now);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }

    case 'weekend': {
      const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      if (day === 6 || day === 0) {
        // Already weekend — show from now through the upcoming Sunday 23:59.
        const end = new Date(now);
        if (day === 6) end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        return { from: now, to: end };
      }
      // Weekday — jump to the upcoming Friday 18:00 .. Sunday 23:59.
      const start = new Date(now);
      const daysUntilFri = (5 - day + 7) % 7;
      start.setDate(start.getDate() + daysUntilFri);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 2);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }

    case 'week': {
      return { from: now, to: new Date(now.getTime() + 7 * DAY) };
    }

    case '2weeks':
    default: {
      return { from: now, to: new Date(now.getTime() + 14 * DAY) };
    }
  }
}

export function rangeDaysFor(range: MapTimeRange): number {
  switch (range) {
    case 'today':
      return 1;
    case 'tomorrow':
      return 2;
    case 'weekend':
      return 3;
    case 'week':
      return 7;
    case '2weeks':
    default:
      return 14;
  }
}
