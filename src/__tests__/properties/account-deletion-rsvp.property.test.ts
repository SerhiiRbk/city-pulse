/**
 * Feature: account-deletion, Property 11: Only future active RSVPs are cancelled on soft delete
 *
 * For any set of event_attendees records for the deleted user, only records where
 * status IN ('going', 'waitlist', 'interested') AND event.starts_at > now()
 * SHALL have their status set to 'cancelled'. Past event records SHALL remain unchanged.
 *
 * **Validates: Requirements 9.1**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyRsvpCancellations,
  classifyAttendanceAnonymization,
  type Attendee,
  type AttendeeStatus,
} from '@/lib/deletion/classification';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

/** Generate a valid ISO timestamp string within a reasonable range */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ts) => new Date(ts).toISOString());

/** Generate a "now" Date within a reasonable range */
const nowArb: fc.Arbitrary<Date> = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ts) => new Date(ts));

/** All possible attendee statuses */
const attendeeStatusArb: fc.Arbitrary<AttendeeStatus> = fc.constantFrom(
  'going',
  'waitlist',
  'interested',
  'cancelled',
  'not_going'
);

/** Active statuses that are eligible for cancellation */
const activeStatusArb: fc.Arbitrary<AttendeeStatus> = fc.constantFrom(
  'going',
  'waitlist',
  'interested'
);

/** Inactive statuses that should never be cancelled */
const inactiveStatusArb: fc.Arbitrary<AttendeeStatus> = fc.constantFrom(
  'cancelled',
  'not_going'
);

const FIXED_USER_ID = '22222222-2222-2222-2222-222222222222';

/** Generate a single attendee record with random status and event date */
const attendeeArb: fc.Arbitrary<Attendee> = fc
  .tuple(fc.uuid(), attendeeStatusArb, isoTimestampArb)
  .map(([eventId, status, eventStartsAt]) => ({
    event_id: eventId,
    user_id: FIXED_USER_ID,
    status,
    event_starts_at: eventStartsAt,
  }));

/** Generate a list of attendee records (0 to 20) */
const attendeeListArb = fc.array(attendeeArb, { minLength: 0, maxLength: 20 });

/** Generate a future attendee with active status (should be cancelled) */
const futureActiveAttendeeArb = (now: Date): fc.Arbitrary<Attendee> =>
  fc
    .tuple(
      fc.uuid(),
      activeStatusArb,
      fc.integer({ min: now.getTime() + 1, max: MAX_TS })
    )
    .map(([eventId, status, startTs]) => ({
      event_id: eventId,
      user_id: FIXED_USER_ID,
      status,
      event_starts_at: new Date(startTs).toISOString(),
    }));

/** Generate a past attendee with active status (should NOT be cancelled) */
const pastActiveAttendeeArb = (now: Date): fc.Arbitrary<Attendee> =>
  fc
    .tuple(
      fc.uuid(),
      activeStatusArb,
      fc.integer({ min: MIN_TS, max: now.getTime() })
    )
    .map(([eventId, status, startTs]) => ({
      event_id: eventId,
      user_id: FIXED_USER_ID,
      status,
      event_starts_at: new Date(startTs).toISOString(),
    }));

/** Generate a future attendee with inactive status (should NOT be cancelled) */
const futureInactiveAttendeeArb = (now: Date): fc.Arbitrary<Attendee> =>
  fc
    .tuple(
      fc.uuid(),
      inactiveStatusArb,
      fc.integer({ min: now.getTime() + 1, max: MAX_TS })
    )
    .map(([eventId, status, startTs]) => ({
      event_id: eventId,
      user_id: FIXED_USER_ID,
      status,
      event_starts_at: new Date(startTs).toISOString(),
    }));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: account-deletion, Property 11: Only future active RSVPs are cancelled on soft delete', () => {
  it('future events with active status are marked for cancellation', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyRsvpCancellations(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isFuture = eventStartsAt.getTime() > now.getTime();
          const isActive = ['going', 'waitlist', 'interested'].includes(
            classified.attendee.status
          );

          if (isFuture && isActive) {
            expect(classified.shouldCancel).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('past events are never marked for cancellation regardless of status', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyRsvpCancellations(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isPastOrNow = eventStartsAt.getTime() <= now.getTime();

          if (isPastOrNow) {
            expect(classified.shouldCancel).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('future events with inactive status (cancelled, not_going) are not marked for cancellation', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyRsvpCancellations(attendees, now);

        for (const classified of result) {
          const isInactive = ['cancelled', 'not_going'].includes(classified.attendee.status);

          if (isInactive) {
            expect(classified.shouldCancel).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('output length equals input length — no records are lost or duplicated', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyRsvpCancellations(attendees, now);
        expect(result.length).toBe(attendees.length);
      }),
      { numRuns: 100 }
    );
  });

  it('shouldCancel is true if and only if status is active AND event is in the future', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyRsvpCancellations(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isFuture = eventStartsAt.getTime() > now.getTime();
          const isActive = ['going', 'waitlist', 'interested'].includes(
            classified.attendee.status
          );

          const expectedShouldCancel = isFuture && isActive;
          expect(classified.shouldCancel).toBe(expectedShouldCancel);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('specifically generated future active attendees are always cancelled', () => {
    // Use a fixed "now" to generate attendees that are guaranteed to be future + active
    const fixedNow = new Date('2025-06-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.array(futureActiveAttendeeArb(fixedNow), { minLength: 1, maxLength: 15 }),
        (attendees) => {
          const result = classifyRsvpCancellations(attendees, fixedNow);

          for (const classified of result) {
            expect(classified.shouldCancel).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('specifically generated past active attendees are never cancelled', () => {
    const fixedNow = new Date('2025-06-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.array(pastActiveAttendeeArb(fixedNow), { minLength: 1, maxLength: 15 }),
        (attendees) => {
          const result = classifyRsvpCancellations(attendees, fixedNow);

          for (const classified of result) {
            expect(classified.shouldCancel).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('specifically generated future inactive attendees are never cancelled', () => {
    const fixedNow = new Date('2025-06-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.array(futureInactiveAttendeeArb(fixedNow), { minLength: 1, maxLength: 15 }),
        (attendees) => {
          const result = classifyRsvpCancellations(attendees, fixedNow);

          for (const classified of result) {
            expect(classified.shouldCancel).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ─── Property 12: Past attendance records are anonymized with NULL user_id ───

describe('Feature: account-deletion, Property 12: Past attendance records are anonymized with NULL user_id', () => {
  it('past event attendance records are classified for anonymization (user_id = NULL)', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyAttendanceAnonymization(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isPastOrNow = eventStartsAt.getTime() <= now.getTime();

          if (isPastOrNow) {
            expect(classified.action).toBe('anonymize');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('future event attendance records are classified for deletion', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyAttendanceAnonymization(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isFuture = eventStartsAt.getTime() > now.getTime();

          if (isFuture) {
            expect(classified.action).toBe('delete');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all records are retained in the output — no records are lost', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyAttendanceAnonymization(attendees, now);
        expect(result.length).toBe(attendees.length);

        // Every input attendee appears in the output
        for (let i = 0; i < attendees.length; i++) {
          expect(result[i].attendee).toBe(attendees[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('action is "anonymize" if and only if event starts_at <= now', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyAttendanceAnonymization(attendees, now);

        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isPastOrNow = eventStartsAt.getTime() <= now.getTime();

          expect(classified.action).toBe(isPastOrNow ? 'anonymize' : 'delete');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('specifically generated past attendance records are always anonymized', () => {
    const fixedNow = new Date('2025-06-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.array(pastActiveAttendeeArb(fixedNow), { minLength: 1, maxLength: 15 }),
        (attendees) => {
          const result = classifyAttendanceAnonymization(attendees, fixedNow);

          for (const classified of result) {
            expect(classified.action).toBe('anonymize');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('specifically generated future attendance records are always deleted', () => {
    const fixedNow = new Date('2025-06-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.array(futureActiveAttendeeArb(fixedNow), { minLength: 1, maxLength: 15 }),
        (attendees) => {
          const result = classifyAttendanceAnonymization(attendees, fixedNow);

          for (const classified of result) {
            expect(classified.action).toBe('delete');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('anonymization classification is independent of attendee status', () => {
    fc.assert(
      fc.property(attendeeListArb, nowArb, (attendees, now) => {
        const result = classifyAttendanceAnonymization(attendees, now);

        // The action depends only on the event date, not on the attendee status
        for (const classified of result) {
          const eventStartsAt = new Date(classified.attendee.event_starts_at);
          const isPastOrNow = eventStartsAt.getTime() <= now.getTime();

          // Regardless of status (going, cancelled, not_going, etc.), the classification
          // is determined solely by the event date
          expect(classified.action).toBe(isPastOrNow ? 'anonymize' : 'delete');
        }
      }),
      { numRuns: 100 }
    );
  });
});
