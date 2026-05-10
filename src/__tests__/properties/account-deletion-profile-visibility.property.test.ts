/**
 * Feature: account-deletion, Property 4: Soft-deleted profiles are excluded from public queries
 *
 * For any profile with `deleted_at IS NOT NULL` and within the grace period,
 * public profile queries (search, event attendees list, contacts) SHALL NOT
 * include that profile in results.
 *
 * **Validates: Requirements 2.3**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isProfilePubliclyVisible } from '@/lib/deletion/profile-visibility';

/**
 * Arbitrary for a non-null ISO date string (simulating deleted_at being set).
 */
const deletedAtArb = fc.date().map((d) => d.toISOString());

/**
 * Arbitrary for a nullable ISO date string (deleted_at can be null or a date).
 */
const nullableDeletedAtArb = fc.option(deletedAtArb, { nil: null });

/**
 * Arbitrary for a full profile visibility state.
 */
const profileArb = fc.record({
  deleted_at: nullableDeletedAtArb,
  is_private: fc.boolean(),
  is_blocked: fc.boolean(),
});

describe('Feature: account-deletion, Property 4: Soft-deleted profiles are excluded from public queries', () => {
  it('profiles with deleted_at set are never publicly visible', () => {
    fc.assert(
      fc.property(deletedAtArb, fc.boolean(), fc.boolean(), (deleted_at, is_private, is_blocked) => {
        const result = isProfilePubliclyVisible({ deleted_at, is_private, is_blocked });
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('profiles with is_private = true are never publicly visible', () => {
    fc.assert(
      fc.property(nullableDeletedAtArb, fc.boolean(), (deleted_at, is_blocked) => {
        const result = isProfilePubliclyVisible({ deleted_at, is_private: true, is_blocked });
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('profiles with is_blocked = true are never publicly visible', () => {
    fc.assert(
      fc.property(nullableDeletedAtArb, fc.boolean(), (deleted_at, is_private) => {
        const result = isProfilePubliclyVisible({ deleted_at, is_private, is_blocked: true });
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('only profiles with deleted_at = null AND is_private = false AND is_blocked = false are visible', () => {
    fc.assert(
      fc.property(profileArb, (profile) => {
        const result = isProfilePubliclyVisible(profile);
        const expected =
          profile.deleted_at === null && profile.is_private === false && profile.is_blocked === false;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('visibility is true only when all three conditions are met simultaneously', () => {
    fc.assert(
      fc.property(profileArb, (profile) => {
        const result = isProfilePubliclyVisible(profile);
        if (result === true) {
          // If visible, ALL conditions must hold
          expect(profile.deleted_at).toBeNull();
          expect(profile.is_private).toBe(false);
          expect(profile.is_blocked).toBe(false);
        } else {
          // If not visible, at least one condition is violated
          const hasViolation =
            profile.deleted_at !== null || profile.is_private === true || profile.is_blocked === true;
          expect(hasViolation).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
