/**
 * Property-based tests for event organizer classification during account deletion.
 *
 * Feature: account-deletion, Property 7: Event organizer classification is correct by event state
 *
 * **Validates: Requirements 5.1, 5.2, 5.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyEvents,
  type ClassifiableEvent,
  type EventStatus,
} from '@/lib/deletion/classification';

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

// Use integer-based timestamp generation to avoid invalid Date issues with fc.date()
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

/** Generate a valid ISO timestamp string within a reasonable range */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ts) => new Date(ts).toISOString());

/** Generate a random event status */
const eventStatusArb: fc.Arbitrary<EventStatus> = fc.constantFrom(
  'draft',
  'published',
  'cancelled',
  'completed'
);

/** Generate a single classifiable event */
const classifiableEventArb: fc.Arbitrary<ClassifiableEvent> = fc.record({
  id: fc.uuid(),
  status: eventStatusArb,
  ends_at: isoTimestampArb,
});

/** Generate a list of classifiable events (0 to 20 events) */
const eventListArb = fc.array(classifiableEventArb, { minLength: 0, maxLength: 20 });

/** Generate a "now" Date within a reasonable range */
const nowArb: fc.Arbitrary<Date> = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ts) => new Date(ts));

// ---------------------------------------------------------------------------
// Property 7 test
// ---------------------------------------------------------------------------

/**
 * Feature: account-deletion, Property 7: Event organizer classification is correct by event state
 *
 * For any set of events where organizer_id = deleted_user, the classification function SHALL:
 * - Transfer organizer_id to system account for events where ends_at > now AND status = 'published'
 * - Delete events where status = 'draft' AND ends_at > now
 * - Retain original organizer_id for events where ends_at <= now OR status = 'cancelled'
 *
 * No event SHALL be misclassified.
 *
 * **Validates: Requirements 5.1, 5.2, 5.5**
 */
describe('Feature: account-deletion, Property 7: Event organizer classification is correct by event state', () => {
  it('every event is classified into exactly one bucket and no event is lost', () => {
    fc.assert(
      fc.property(eventListArb, nowArb, (events, now) => {
        const result = classifyEvents(events, now);

        // Total classified events must equal input count (no event lost or duplicated)
        const totalClassified =
          result.transfer.length + result.delete.length + result.retain.length;
        expect(totalClassified).toBe(events.length);

        // All input event IDs must appear exactly once across all buckets
        const classifiedIds = [
          ...result.transfer.map((e) => e.id),
          ...result.delete.map((e) => e.id),
          ...result.retain.map((e) => e.id),
        ];
        const inputIds = events.map((e) => e.id);
        expect(classifiedIds.sort()).toEqual(inputIds.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('future published events are classified as transfer', () => {
    fc.assert(
      fc.property(eventListArb, nowArb, (events, now) => {
        const result = classifyEvents(events, now);

        // Every event in the transfer bucket must be future AND published (or completed)
        for (const event of result.transfer) {
          const endsAt = new Date(event.ends_at);
          expect(endsAt.getTime()).toBeGreaterThan(now.getTime());
          expect(event.status).not.toBe('draft');
          expect(event.status).not.toBe('cancelled');
        }

        // Every future published event from input must be in transfer
        for (const event of events) {
          const endsAt = new Date(event.ends_at);
          const isFuture = endsAt.getTime() > now.getTime();
          if (isFuture && event.status === 'published') {
            expect(result.transfer).toContainEqual(event);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('future draft events are classified as delete', () => {
    fc.assert(
      fc.property(eventListArb, nowArb, (events, now) => {
        const result = classifyEvents(events, now);

        // Every event in the delete bucket must be future AND draft
        for (const event of result.delete) {
          const endsAt = new Date(event.ends_at);
          expect(endsAt.getTime()).toBeGreaterThan(now.getTime());
          expect(event.status).toBe('draft');
        }

        // Every future draft event from input must be in delete
        for (const event of events) {
          const endsAt = new Date(event.ends_at);
          const isFuture = endsAt.getTime() > now.getTime();
          if (isFuture && event.status === 'draft') {
            expect(result.delete).toContainEqual(event);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('past events and cancelled events are classified as retain', () => {
    fc.assert(
      fc.property(eventListArb, nowArb, (events, now) => {
        const result = classifyEvents(events, now);

        // Every event in the retain bucket must be past OR cancelled
        for (const event of result.retain) {
          const endsAt = new Date(event.ends_at);
          const isPastOrNow = endsAt.getTime() <= now.getTime();
          const isCancelled = event.status === 'cancelled';
          expect(isPastOrNow || isCancelled).toBe(true);
        }

        // Every past event from input must be in retain
        for (const event of events) {
          const endsAt = new Date(event.ends_at);
          const isPastOrNow = endsAt.getTime() <= now.getTime();
          if (isPastOrNow) {
            expect(result.retain).toContainEqual(event);
          }
        }

        // Every cancelled event from input must be in retain
        for (const event of events) {
          if (event.status === 'cancelled') {
            expect(result.retain).toContainEqual(event);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no event is misclassified — classification matches the expected rule for each event', () => {
    fc.assert(
      fc.property(eventListArb, nowArb, (events, now) => {
        const result = classifyEvents(events, now);

        // For each input event, determine expected classification and verify
        for (const event of events) {
          const endsAt = new Date(event.ends_at);
          const isFuture = endsAt.getTime() > now.getTime();

          if (event.status === 'cancelled') {
            // Cancelled → always retain
            expect(result.retain).toContainEqual(event);
            expect(result.transfer).not.toContainEqual(event);
            expect(result.delete).not.toContainEqual(event);
          } else if (!isFuture) {
            // Past or exactly now → retain
            expect(result.retain).toContainEqual(event);
            expect(result.transfer).not.toContainEqual(event);
            expect(result.delete).not.toContainEqual(event);
          } else if (event.status === 'draft') {
            // Future draft → delete
            expect(result.delete).toContainEqual(event);
            expect(result.transfer).not.toContainEqual(event);
            expect(result.retain).not.toContainEqual(event);
          } else {
            // Future published/completed → transfer
            expect(result.transfer).toContainEqual(event);
            expect(result.delete).not.toContainEqual(event);
            expect(result.retain).not.toContainEqual(event);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
