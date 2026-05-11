/**
 * Feature: account-deletion, Property 8: Crew host succession follows earliest-moderator rule
 *
 * For any crew where the host is being deleted: if at least one moderator exists,
 * the moderator with the earliest joined_at timestamp SHALL be promoted to host.
 * If no moderators exist, the crew SHALL be marked for deletion.
 *
 * **Validates: Requirements 6.2, 6.3**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyCrewSuccession,
  type ClassifiableCrew,
  type CrewMemberInfo,
} from '@/lib/deletion/classification';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

const userIdArb = fc.uuid();

// Generate a valid ISO timestamp within a reasonable range (2020–2026)
// Using integer milliseconds to avoid invalid date issues with fc.date in fast-check v4
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2026-12-31T23:59:59Z').getTime();
const timestampArb = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

const moderatorArb: fc.Arbitrary<CrewMemberInfo> = fc.record({
  user_id: userIdArb,
  role: fc.constant('moderator' as const),
  joined_at: timestampArb,
});

const memberArb: fc.Arbitrary<CrewMemberInfo> = fc.record({
  user_id: userIdArb,
  role: fc.constant('member' as const),
  joined_at: timestampArb,
});

// Crew with at least one moderator (and optionally regular members)
const crewWithModeratorsArb: fc.Arbitrary<ClassifiableCrew> = fc
  .tuple(
    fc.uuid(), // crew id
    fc.array(moderatorArb, { minLength: 1, maxLength: 10 }),
    fc.array(memberArb, { minLength: 0, maxLength: 10 }),
  )
  .map(([id, moderators, members]) => ({
    id,
    members: [...moderators, ...members],
  }));

// Crew with zero moderators (only regular members or empty)
const crewWithoutModeratorsArb: fc.Arbitrary<ClassifiableCrew> = fc
  .tuple(
    fc.uuid(), // crew id
    fc.array(memberArb, { minLength: 0, maxLength: 10 }),
  )
  .map(([id, members]) => ({
    id,
    members,
  }));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: account-deletion, Property 8: Crew host succession follows earliest-moderator rule', () => {
  it('promotes the moderator with the earliest joined_at when moderators exist', () => {
    fc.assert(
      fc.property(crewWithModeratorsArb, (crew) => {
        const result = classifyCrewSuccession(crew);

        // Must be a promote_moderator action
        expect(result.type).toBe('promote_moderator');

        if (result.type === 'promote_moderator') {
          const promoted = result.moderator;

          // The promoted member must be a moderator in the crew
          expect(promoted.role).toBe('moderator');
          expect(crew.members).toContainEqual(promoted);

          // The promoted moderator must have the earliest joined_at among all moderators
          const moderators = crew.members.filter((m) => m.role === 'moderator');
          const earliestTimestamp = Math.min(
            ...moderators.map((m) => new Date(m.joined_at).getTime()),
          );
          expect(new Date(promoted.joined_at).getTime()).toBe(earliestTimestamp);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('marks crew for deletion when no moderators exist', () => {
    fc.assert(
      fc.property(crewWithoutModeratorsArb, (crew) => {
        const result = classifyCrewSuccession(crew);

        // Must be a delete_crew action
        expect(result.type).toBe('delete_crew');
      }),
      { numRuns: 100 },
    );
  });

  it('never returns no_action for crews passed to classifyCrewSuccession', () => {
    // classifyCrewSuccession is called only for crews where the host is being deleted,
    // so it should always return either promote_moderator or delete_crew
    const anyCrewArb = fc.oneof(crewWithModeratorsArb, crewWithoutModeratorsArb);

    fc.assert(
      fc.property(anyCrewArb, (crew) => {
        const result = classifyCrewSuccession(crew);
        expect(result.type).not.toBe('no_action');
      }),
      { numRuns: 100 },
    );
  });

  it('selects a unique earliest moderator even with many moderators having different timestamps', () => {
    // Generate crews where all moderators have distinct joined_at timestamps
    const distinctModeratorsCrewArb: fc.Arbitrary<ClassifiableCrew> = fc
      .tuple(
        fc.uuid(),
        fc.uniqueArray(timestampArb, { minLength: 2, maxLength: 10 }),
      )
      .map(([id, timestamps]) => ({
        id,
        members: timestamps.map((ts, i) => ({
          user_id: `user-${i}-${id}`,
          role: 'moderator' as const,
          joined_at: ts,
        })),
      }));

    fc.assert(
      fc.property(distinctModeratorsCrewArb, (crew) => {
        const result = classifyCrewSuccession(crew);

        expect(result.type).toBe('promote_moderator');

        if (result.type === 'promote_moderator') {
          // With distinct timestamps, there should be exactly one earliest
          const moderators = crew.members.filter((m) => m.role === 'moderator');
          const sorted = [...moderators].sort(
            (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
          );
          expect(result.moderator.joined_at).toBe(sorted[0].joined_at);
          expect(result.moderator.user_id).toBe(sorted[0].user_id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('ignores regular members when selecting the successor', () => {
    // Crew with both moderators and members — only moderators should be considered
    const mixedCrewArb: fc.Arbitrary<ClassifiableCrew> = fc
      .tuple(
        fc.uuid(),
        fc.array(moderatorArb, { minLength: 1, maxLength: 5 }),
        fc.array(memberArb, { minLength: 1, maxLength: 5 }),
      )
      .map(([id, moderators, members]) => ({
        id,
        members: [...moderators, ...members],
      }));

    fc.assert(
      fc.property(mixedCrewArb, (crew) => {
        const result = classifyCrewSuccession(crew);

        expect(result.type).toBe('promote_moderator');

        if (result.type === 'promote_moderator') {
          // The promoted user must be a moderator, never a regular member
          expect(result.moderator.role).toBe('moderator');

          // Even if a regular member joined earlier, the moderator is chosen
          const moderators = crew.members.filter((m) => m.role === 'moderator');
          expect(moderators).toContainEqual(result.moderator);
        }
      }),
      { numRuns: 100 },
    );
  });
});
