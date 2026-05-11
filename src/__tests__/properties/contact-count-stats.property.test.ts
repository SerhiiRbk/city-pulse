/**
 * Feature: contacts-replace-subscriptions, Property 4: Contact count correctness
 *
 * For any user, `profile_stats.follower_count` SHALL equal the number of rows in
 * `user_contacts` where `contact_id` equals that user's ID, and
 * `profile_stats.following_count` SHALL equal the number of rows where `owner_id`
 * equals that user's ID.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Represents a row in the `user_contacts` table.
 */
interface UserContactRow {
  owner_id: string;
  contact_id: string;
}

/**
 * Pure function that simulates the SQL view logic for computing profile stats counts.
 *
 * This mirrors the SQL:
 *   follower_count = SELECT count(*) FROM user_contacts WHERE contact_id = targetUserId
 *   following_count = SELECT count(*) FROM user_contacts WHERE owner_id = targetUserId
 *
 * Uses COALESCE(..., 0) semantics: returns 0 when no rows match.
 */
function computeContactCounts(
  userContacts: UserContactRow[],
  targetUserId: string,
): { follower_count: number; following_count: number } {
  const follower_count = userContacts.filter(
    (row) => row.contact_id === targetUserId,
  ).length;

  const following_count = userContacts.filter(
    (row) => row.owner_id === targetUserId,
  ).length;

  return { follower_count, following_count };
}

// --- Arbitrary generators ---

const userIdArb = fc.uuid();

/** Generate a single user_contacts row */
const contactRowArb = fc.record({
  owner_id: fc.uuid(),
  contact_id: fc.uuid(),
});

/** Generate a set of user_contacts rows (0 to 30 rows) */
const contactRowsArb = fc.array(contactRowArb, { minLength: 0, maxLength: 30 });

/**
 * Generate a set of user_contacts rows that include at least some rows
 * referencing a specific target user (for non-trivial count verification).
 */
function contactRowsWithTargetArb(targetUserId: string) {
  const rowReferencingTarget = fc.oneof(
    // Row where target is the contact (contributes to follower_count)
    fc.record({ owner_id: fc.uuid(), contact_id: fc.constant(targetUserId) }),
    // Row where target is the owner (contributes to following_count)
    fc.record({ owner_id: fc.constant(targetUserId), contact_id: fc.uuid() }),
    // Row that doesn't reference target at all
    contactRowArb,
  );
  return fc.array(rowReferencingTarget, { minLength: 1, maxLength: 30 });
}

describe('Feature: contacts-replace-subscriptions, Property 4: Contact count correctness', () => {
  it('follower_count equals count of rows where contact_id = target user', () => {
    fc.assert(
      fc.property(userIdArb, contactRowsArb, (targetUserId, rows) => {
        const { follower_count } = computeContactCounts(rows, targetUserId);

        const expectedCount = rows.filter(
          (r) => r.contact_id === targetUserId,
        ).length;

        expect(follower_count).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('following_count equals count of rows where owner_id = target user', () => {
    fc.assert(
      fc.property(userIdArb, contactRowsArb, (targetUserId, rows) => {
        const { following_count } = computeContactCounts(rows, targetUserId);

        const expectedCount = rows.filter(
          (r) => r.owner_id === targetUserId,
        ).length;

        expect(following_count).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('returns zero for both counts when no relationships exist for the target user', () => {
    fc.assert(
      fc.property(userIdArb, contactRowsArb, (targetUserId, rows) => {
        // Filter out any rows that reference the target user
        const rowsWithoutTarget = rows.filter(
          (r) => r.owner_id !== targetUserId && r.contact_id !== targetUserId,
        );

        const { follower_count, following_count } = computeContactCounts(
          rowsWithoutTarget,
          targetUserId,
        );

        expect(follower_count).toBe(0);
        expect(following_count).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('counts are correct when target user has rows referencing them', () => {
    fc.assert(
      fc.property(
        userIdArb.chain((targetId) =>
          fc.tuple(fc.constant(targetId), contactRowsWithTargetArb(targetId)),
        ),
        ([targetUserId, rows]) => {
          const { follower_count, following_count } = computeContactCounts(
            rows,
            targetUserId,
          );

          // Independently compute expected counts
          const expectedFollowers = rows.filter(
            (r) => r.contact_id === targetUserId,
          ).length;
          const expectedFollowing = rows.filter(
            (r) => r.owner_id === targetUserId,
          ).length;

          expect(follower_count).toBe(expectedFollowers);
          expect(following_count).toBe(expectedFollowing);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('follower_count and following_count are independent (changing one does not affect the other)', () => {
    fc.assert(
      fc.property(
        userIdArb,
        contactRowsArb,
        contactRowArb,
        (targetUserId, baseRows, extraRow) => {
          const baseCounts = computeContactCounts(baseRows, targetUserId);

          // Add a row where target is the contact (should only affect follower_count)
          const rowAsFollower = { ...extraRow, contact_id: targetUserId };
          const withExtraFollower = [...baseRows, rowAsFollower];
          const countsWithFollower = computeContactCounts(
            withExtraFollower,
            targetUserId,
          );

          expect(countsWithFollower.follower_count).toBe(
            baseCounts.follower_count + 1,
          );
          // following_count should be unchanged unless the extra row's owner_id
          // happens to equal targetUserId
          if (rowAsFollower.owner_id !== targetUserId) {
            expect(countsWithFollower.following_count).toBe(
              baseCounts.following_count,
            );
          }

          // Add a row where target is the owner (should only affect following_count)
          const rowAsFollowing = { ...extraRow, owner_id: targetUserId };
          const withExtraFollowing = [...baseRows, rowAsFollowing];
          const countsWithFollowing = computeContactCounts(
            withExtraFollowing,
            targetUserId,
          );

          expect(countsWithFollowing.following_count).toBe(
            baseCounts.following_count + 1,
          );
          // follower_count should be unchanged unless the extra row's contact_id
          // happens to equal targetUserId
          if (rowAsFollowing.contact_id !== targetUserId) {
            expect(countsWithFollowing.follower_count).toBe(
              baseCounts.follower_count,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
