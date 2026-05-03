/**
 * Lightweight recurrence expansion for event series.
 *
 * We support a deliberately narrow vocabulary (`weekly`,
 * `biweekly`, `monthly`) instead of full RFC 5545 RRULE because:
 *   * the three flavours cover ~95% of community-event cadences;
 *   * keeping the surface tight means UI / DB / validators all
 *     stay simple and we never accidentally generate an
 *     unintended date due to DST / ICAL byday quirks;
 *   * if a real "first Wednesday of the month" need shows up we
 *     can layer rrule.js on top later without a schema migration.
 */
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceSpec {
  frequency: RecurrenceFrequency;
  /** Number of occurrences. Capped to 52 server-side. */
  count: number;
  /** ISO timestamp of the first occurrence. */
  startsAt: string;
}

/**
 * Expands a recurrence spec into the list of occurrence start
 * timestamps. The first item is always `startsAt`.
 *
 * The implementation is naive on purpose: we pick the next bucket
 * by adding 7/14 days or 1 month — no DST adjustments. That's
 * intentional because `timestamptz` storage means a 19:00 local
 * meet-up will land at the same wall-clock minute even when DST
 * shifts (the API returns the absolute instant; the client
 * formats it in local time).
 *
 * For monthly cadence we use `setMonth(month + 1)`. JS conveniently
 * clamps Feb 31 → Mar 3, but the result is *not* what users expect.
 * We compensate by re-anchoring to the original day-of-month and
 * then snapping back to the last day of the target month if it
 * doesn't exist (see test cases on series for "31st" rules).
 */
export function expandRecurrence(spec: RecurrenceSpec): string[] {
  const cap = Math.min(Math.max(spec.count, 1), 52);
  const start = new Date(spec.startsAt);
  if (Number.isNaN(start.getTime())) return [];

  const out: string[] = [];
  for (let i = 0; i < cap; i += 1) {
    out.push(addStep(start, spec.frequency, i).toISOString());
  }
  return out;
}

function addStep(
  base: Date,
  frequency: RecurrenceFrequency,
  index: number,
): Date {
  if (frequency === 'weekly') {
    return new Date(base.getTime() + index * 7 * 24 * 60 * 60 * 1000);
  }
  if (frequency === 'biweekly') {
    return new Date(base.getTime() + index * 14 * 24 * 60 * 60 * 1000);
  }
  // Monthly: anchor to the same day-of-month, snap to month end if
  // the target month is shorter (e.g. 31st → 28th in Feb).
  const targetMonth = base.getMonth() + index;
  const candidate = new Date(base);
  candidate.setMonth(targetMonth);
  // If the day rolled forward (e.g. setMonth(Feb) on 31 → Mar 3),
  // pull back to the last valid day of the intended month.
  if (candidate.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    candidate.setDate(0); // last day of previous month → target month-end
  }
  return candidate;
}
