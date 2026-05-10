/**
 * Property-based tests for group admin succession during account deletion.
 *
 * Feature: account-deletion, Property 13: Group admin succession follows promotion hierarchy
 *
 * **Validates: Requirements 10.2, 10.3, 10.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyGroupSuccession,
  type GroupMemberInfo,
  type ClassifiableGroup,
} from '@/lib/deletion/classification';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/**
 * Generates a valid ISO timestamp string within a reasonable range.
 * We use integer milliseconds between 2020-01-01 and 2026-12-31 to avoid invalid date issues.
 */
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2026-12-31T23:59:59Z').getTime();

const isoTimestampArb = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

/**
 * Generates a group member with a specific role.
 */
function groupMemberArb(role: 'moderator' | 'member'): fc.Arbitrary<GroupMemberInfo> {
  return fc.record({
    user_id: fc.uuid(),
    role: fc.constant(role),
    joined_at: isoTimestampArb,
  });
}

/**
 * Generates a non-empty array of moderators (1 to 10).
 */
const moderatorsArb = fc.array(groupMemberArb('moderator'), { minLength: 1, maxLength: 10 });

/**
 * Generates a non-empty array of members (1 to 10).
 */
const membersArb = fc.array(groupMemberArb('member'), { minLength: 1, maxLength: 10 });

/**
 * Generates a group with moderators (and optionally members).
 * This represents the case where moderators exist → earliest moderator should be promoted.
 */
const groupWithModeratorsArb: fc.Arbitrary<ClassifiableGroup> = fc
  .tuple(
    fc.uuid(), // group id
    moderatorsArb,
    fc.array(groupMemberArb('member'), { minLength: 0, maxLength: 5 }),
  )
  .map(([id, moderators, members]) => ({
    id,
    members: [...moderators, ...members],
  }));

/**
 * Generates a group with only members (no moderators).
 * This represents the case where no moderators exist → earliest member should be promoted.
 */
const groupWithOnlyMembersArb: fc.Arbitrary<ClassifiableGroup> = fc
  .tuple(fc.uuid(), membersArb)
  .map(([id, members]) => ({
    id,
    members,
  }));

/**
 * Generates a group with no remaining members.
 * This represents the case where no other members exist → group should be blocked.
 */
const emptyGroupArb: fc.Arbitrary<ClassifiableGroup> = fc.uuid().map((id) => ({
  id,
  members: [],
}));

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Finds the member with the earliest joined_at from a list.
 */
function findEarliest(members: GroupMemberInfo[]): GroupMemberInfo {
  return members.reduce((prev, curr) =>
    new Date(prev.joined_at).getTime() <= new Date(curr.joined_at).getTime() ? prev : curr
  );
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: account-deletion, Property 13: Group admin succession follows promotion hierarchy', () => {
  it('if moderators exist → earliest moderator by joined_at becomes admin', () => {
    fc.assert(
      fc.property(groupWithModeratorsArb, (group) => {
        const result = classifyGroupSuccession(group);

        const moderators = group.members.filter((m) => m.role === 'moderator');
        const expectedModerator = findEarliest(moderators);

        expect(result.type).toBe('promote_moderator');
        if (result.type === 'promote_moderator') {
          expect(result.moderator.user_id).toBe(expectedModerator.user_id);
          expect(result.moderator.joined_at).toBe(expectedModerator.joined_at);
          expect(result.moderator.role).toBe('moderator');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('if no moderators but members exist → earliest member by joined_at becomes admin', () => {
    fc.assert(
      fc.property(groupWithOnlyMembersArb, (group) => {
        const result = classifyGroupSuccession(group);

        const members = group.members.filter((m) => m.role === 'member');
        const expectedMember = findEarliest(members);

        expect(result.type).toBe('promote_member');
        if (result.type === 'promote_member') {
          expect(result.member.user_id).toBe(expectedMember.user_id);
          expect(result.member.joined_at).toBe(expectedMember.joined_at);
          expect(result.member.role).toBe('member');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('if no other members exist → group is blocked (is_blocked = true)', () => {
    fc.assert(
      fc.property(emptyGroupArb, (group) => {
        const result = classifyGroupSuccession(group);

        expect(result.type).toBe('block_group');
      }),
      { numRuns: 100 },
    );
  });

  it('moderators always take priority over members regardless of joined_at', () => {
    // Generate a group where a member joined earlier than any moderator
    // The moderator should still be promoted (hierarchy takes priority)
    const groupWithEarlyMemberArb = fc
      .tuple(
        fc.uuid(),
        fc.array(groupMemberArb('moderator'), { minLength: 1, maxLength: 5 }),
        fc.array(groupMemberArb('member'), { minLength: 1, maxLength: 5 }),
      )
      .map(([id, moderators, members]) => {
        // Force at least one member to have an earlier joined_at than all moderators
        const earliestModeratorTime = Math.min(
          ...moderators.map((m) => new Date(m.joined_at).getTime())
        );
        const earlyMember: GroupMemberInfo = {
          user_id: 'early-member-id',
          role: 'member',
          joined_at: new Date(earliestModeratorTime - 86400000).toISOString(), // 1 day earlier
        };
        return {
          id,
          members: [...moderators, earlyMember, ...members],
        };
      });

    fc.assert(
      fc.property(groupWithEarlyMemberArb, (group) => {
        const result = classifyGroupSuccession(group);

        // Even though a member joined earlier, a moderator should be promoted
        expect(result.type).toBe('promote_moderator');
      }),
      { numRuns: 100 },
    );
  });
});
