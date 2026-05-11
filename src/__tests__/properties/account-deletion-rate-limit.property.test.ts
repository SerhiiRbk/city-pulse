/**
 * Feature: account-deletion, Property 16: Deletion rate limit rejects requests within 24-hour window
 *
 * For any user with a deletion request at timestamp T, a subsequent deletion request
 * at timestamp T2 SHALL be rejected if T2 - T < 24 hours. Requests where T2 - T >= 24 hours
 * SHALL be accepted.
 *
 * **Validates: Requirements 12.4, 12.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isRateLimited } from '../../lib/deletion/rate-limit';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Generator for a base timestamp within a reasonable range (2020-2030).
 * Filters out invalid (NaN) dates to ensure only valid timestamps are tested.
 */
const baseTimestampArb = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  })
  .filter((d) => !Number.isNaN(d.getTime()));

/**
 * Generator for a positive offset in milliseconds less than 24 hours (1ms to 23h59m59s999ms).
 */
const offsetWithin24hArb = fc.integer({ min: 1, max: TWENTY_FOUR_HOURS_MS - 1 });

/**
 * Generator for an offset in milliseconds >= 24 hours (24h to 30 days).
 */
const offsetAtOrBeyond24hArb = fc.integer({
  min: TWENTY_FOUR_HOURS_MS,
  max: 30 * TWENTY_FOUR_HOURS_MS,
});

describe('Feature: account-deletion, Property 16: Deletion rate limit rejects requests within 24-hour window', () => {
  it('rejects requests when time difference is less than 24 hours', () => {
    fc.assert(
      fc.property(baseTimestampArb, offsetWithin24hArb, (baseDate, offsetMs) => {
        const lastRequestAt = baseDate;
        const newRequestAt = new Date(baseDate.getTime() + offsetMs);

        const result = isRateLimited(lastRequestAt, newRequestAt);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('accepts requests when time difference is exactly 24 hours or more', () => {
    fc.assert(
      fc.property(baseTimestampArb, offsetAtOrBeyond24hArb, (baseDate, offsetMs) => {
        const lastRequestAt = baseDate;
        const newRequestAt = new Date(baseDate.getTime() + offsetMs);

        const result = isRateLimited(lastRequestAt, newRequestAt);
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects requests at the exact same timestamp (zero difference)', () => {
    fc.assert(
      fc.property(baseTimestampArb, (baseDate) => {
        const result = isRateLimited(baseDate, baseDate);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('boundary: request at exactly 24h minus 1ms is rejected', () => {
    fc.assert(
      fc.property(baseTimestampArb, (baseDate) => {
        const almostExpired = new Date(baseDate.getTime() + TWENTY_FOUR_HOURS_MS - 1);
        const result = isRateLimited(baseDate, almostExpired);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('boundary: request at exactly 24h is accepted', () => {
    fc.assert(
      fc.property(baseTimestampArb, (baseDate) => {
        const exactlyExpired = new Date(baseDate.getTime() + TWENTY_FOUR_HOURS_MS);
        const result = isRateLimited(baseDate, exactlyExpired);
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
