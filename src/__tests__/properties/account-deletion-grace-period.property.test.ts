/**
 * Feature: account-deletion, Property 3: Grace period calculation is exactly 720 hours
 *
 * For any valid deletion request timestamp T, the computed grace_period_ends_at
 * SHALL equal T + 720 hours (30 × 24 hours), regardless of timezone or daylight
 * saving transitions.
 *
 * **Validates: Requirements 2.1**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateGracePeriodEnd } from '@/lib/deletion/grace-period';

const GRACE_PERIOD_MS = 720 * 60 * 60 * 1000; // 720 hours in milliseconds

/**
 * Arbitrary generator for valid timestamps.
 * Generates dates across a wide range including timezone boundary dates,
 * DST transition periods, and edge cases like year boundaries.
 * Uses integer-based generation to avoid NaN dates from fc.date().
 */
const timestampArb = fc
  .integer({
    min: new Date('2000-01-01T00:00:00.000Z').getTime(),
    max: new Date('2100-12-31T23:59:59.999Z').getTime(),
  })
  .map((ms) => new Date(ms));

describe('Feature: account-deletion, Property 3: Grace period calculation is exactly 720 hours', () => {
  it('grace_period_ends_at equals requestedAt + exactly 720 hours for any timestamp', () => {
    fc.assert(
      fc.property(timestampArb, (requestedAt) => {
        const result = calculateGracePeriodEnd(requestedAt);
        const expectedMs = requestedAt.getTime() + GRACE_PERIOD_MS;

        expect(result.getTime()).toBe(expectedMs);
      }),
      { numRuns: 100 },
    );
  });

  it('grace period difference is always exactly 720 hours in milliseconds', () => {
    fc.assert(
      fc.property(timestampArb, (requestedAt) => {
        const result = calculateGracePeriodEnd(requestedAt);
        const diffMs = result.getTime() - requestedAt.getTime();

        expect(diffMs).toBe(GRACE_PERIOD_MS);
      }),
      { numRuns: 100 },
    );
  });

  it('grace period end is always strictly after the request timestamp', () => {
    fc.assert(
      fc.property(timestampArb, (requestedAt) => {
        const result = calculateGracePeriodEnd(requestedAt);

        expect(result.getTime()).toBeGreaterThan(requestedAt.getTime());
      }),
      { numRuns: 100 },
    );
  });

  it('calculation is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(timestampArb, (requestedAt) => {
        const result1 = calculateGracePeriodEnd(requestedAt);
        const result2 = calculateGracePeriodEnd(requestedAt);

        expect(result1.getTime()).toBe(result2.getTime());
      }),
      { numRuns: 100 },
    );
  });

  it('handles timestamps near DST transitions (March/November boundaries)', () => {
    // Generate timestamps specifically around common DST transition months
    const dstTimestampArb = fc.oneof(
      // March timestamps (spring forward in many timezones)
      fc.integer({ min: 0, max: 30 }).map(
        (day) => new Date(`2024-03-${String(day + 1).padStart(2, '0')}T02:30:00.000Z`),
      ),
      // November timestamps (fall back in many timezones)
      fc.integer({ min: 0, max: 29 }).map(
        (day) => new Date(`2024-11-${String(day + 1).padStart(2, '0')}T01:30:00.000Z`),
      ),
      // October timestamps (EU DST transition)
      fc.integer({ min: 0, max: 30 }).map(
        (day) => new Date(`2024-10-${String(day + 1).padStart(2, '0')}T01:00:00.000Z`),
      ),
    );

    fc.assert(
      fc.property(dstTimestampArb, (requestedAt) => {
        const result = calculateGracePeriodEnd(requestedAt);
        const diffMs = result.getTime() - requestedAt.getTime();

        // Must always be exactly 720 hours regardless of DST
        expect(diffMs).toBe(GRACE_PERIOD_MS);
      }),
      { numRuns: 100 },
    );
  });

  it('handles year boundary timestamps correctly', () => {
    const yearBoundaryArb = fc.integer({ min: 2000, max: 2099 }).map(
      (year) => new Date(`${year}-12-31T23:59:59.999Z`),
    );

    fc.assert(
      fc.property(yearBoundaryArb, (requestedAt) => {
        const result = calculateGracePeriodEnd(requestedAt);
        const diffMs = result.getTime() - requestedAt.getTime();

        expect(diffMs).toBe(GRACE_PERIOD_MS);
      }),
      { numRuns: 100 },
    );
  });
});
