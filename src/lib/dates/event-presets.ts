/**
 * Friendly date-window presets shared by the events feed and the city-events
 * filter bar. Returned values are plain `YYYY-MM-DD` strings so they can ride
 * in URL search params and be inflated to start/end of day on the server.
 *
 * "weekend" semantics intentionally mirror `lib/events/time-ranges.ts`: when
 * the user is already on a weekend day we don't hide the current weekend by
 * jumping forward — we use the upcoming Sat/Sun window relative to today.
 */

export type EventDatePreset =
  | 'today'
  | 'tomorrow'
  | 'weekend'
  | 'next_weekend'
  | 'next_week';

export const EVENT_DATE_PRESETS: readonly EventDatePreset[] = [
  'today',
  'tomorrow',
  'weekend',
  'next_weekend',
  'next_week',
] as const;

export function isEventDatePreset(value: string | undefined | null): value is EventDatePreset {
  return !!value && (EVENT_DATE_PRESETS as readonly string[]).includes(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve a preset to inclusive YYYY-MM-DD `from`/`to` strings.
 * `now` is injectable for tests.
 */
export function resolveEventPreset(
  preset: EventDatePreset,
  now: Date = new Date(),
): { from: string; to: string } {
  switch (preset) {
    case 'today':
      return { from: fmtDate(now), to: fmtDate(now) };

    case 'tomorrow': {
      const t = new Date(now.getTime() + DAY_MS);
      return { from: fmtDate(t), to: fmtDate(t) };
    }

    case 'weekend': {
      // 0 = Sun … 6 = Sat. On Sun we collapse to "today" (tail of the
      // weekend); on Sat we use today + tomorrow; otherwise we jump to
      // the upcoming Sat-Sun pair.
      const dow = now.getDay();
      if (dow === 0) {
        return { from: fmtDate(now), to: fmtDate(now) };
      }
      if (dow === 6) {
        const sun = new Date(now.getTime() + DAY_MS);
        return { from: fmtDate(now), to: fmtDate(sun) };
      }
      const daysUntilSat = 6 - dow; // 1..5
      const sat = new Date(now.getTime() + daysUntilSat * DAY_MS);
      const sun = new Date(sat.getTime() + DAY_MS);
      return { from: fmtDate(sat), to: fmtDate(sun) };
    }

    case 'next_weekend': {
      // Anchor "this weekend"'s Saturday, then jump 7 days forward.
      const dow = now.getDay();
      let thisSat: Date;
      if (dow === 0) {
        thisSat = new Date(now.getTime() - DAY_MS);
      } else if (dow === 6) {
        thisSat = new Date(now);
      } else {
        thisSat = new Date(now.getTime() + (6 - dow) * DAY_MS);
      }
      const sat = new Date(thisSat.getTime() + 7 * DAY_MS);
      const sun = new Date(sat.getTime() + DAY_MS);
      return { from: fmtDate(sat), to: fmtDate(sun) };
    }

    case 'next_week': {
      // Monday of the upcoming week through the Sunday after.
      const dow = now.getDay();
      const daysUntilMon = (1 - dow + 7) % 7 || 7;
      const mon = new Date(now.getTime() + daysUntilMon * DAY_MS);
      const sun = new Date(mon.getTime() + 6 * DAY_MS);
      return { from: fmtDate(mon), to: fmtDate(sun) };
    }
  }
}
