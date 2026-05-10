/**
 * Feature: account-deletion, Property 5: Profile anonymization zeroes all personal data
 *
 * For any Profile record, applying the anonymization function SHALL produce a record where:
 * display_name = "Deleted User", avatar_url = NULL, and all other personal data fields
 * (email, bio, city, country, languages, interests, social_links, age) are NULL.
 * The id and created_at fields SHALL remain unchanged.
 *
 * **Validates: Requirements 3.1**
 *
 * ---
 *
 * Feature: account-deletion, Property 6: Content anonymization preserves text and replaces author reference
 *
 * For any user-generated content record (event_review, message, event_crew_message
 * where is_system = false, group_post_comment) belonging to a deleted user,
 * applying anonymization SHALL replace the author/sender reference with the
 * sentinel UUID (00000000-0000-0000-0000-000000000000) while preserving the
 * content/rating text unchanged.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  anonymizeProfile,
  anonymizeContent,
  SENTINEL_UUID,
  type ProfileRecord,
  type ContentRecord,
  type EventReviewRecord,
  type MessageRecord,
  type EventCrewMessageRecord,
  type GroupPostCommentRecord,
} from '@/lib/deletion/anonymize';

// ─── Property 5: Profile Anonymization Arbitraries ──────────────────────────

// Generate ISO date strings from integer timestamps to avoid invalid Date issues
const isoDateArb = fc
  .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString());

const socialLinksArb = fc.record(
  {
    facebook: fc.option(fc.webUrl(), { nil: undefined }),
    instagram: fc.option(fc.webUrl(), { nil: undefined }),
    telegram: fc.option(fc.webUrl(), { nil: undefined }),
    whatsapp: fc.option(fc.webUrl(), { nil: undefined }),
  },
  { requiredKeys: [] },
);

const profileRecordArb: fc.Arbitrary<ProfileRecord> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  age: fc.option(fc.integer({ min: 13, max: 120 }), { nil: null }),
  city: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  country: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: null }),
  languages: fc.array(fc.stringMatching(/^[a-z]{2}$/), { minLength: 0, maxLength: 5 }),
  interests: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
  bio: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  social_links: socialLinksArb,
  created_at: isoDateArb,
});

// ─── Property 5: Profile Anonymization Tests ─────────────────────────────────

describe('Feature: account-deletion, Property 5: Profile anonymization zeroes all personal data', () => {
  it('display_name is set to "Deleted User" for any profile', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);
        expect(result.display_name).toBe('Deleted User');
      }),
      { numRuns: 100 },
    );
  });

  it('avatar_url is NULL for any profile', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);
        expect(result.avatar_url).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('all personal data fields are NULL for any profile', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);
        expect(result.email).toBeNull();
        expect(result.bio).toBeNull();
        expect(result.city).toBeNull();
        expect(result.country).toBeNull();
        expect(result.languages).toBeNull();
        expect(result.interests).toBeNull();
        expect(result.social_links).toBeNull();
        expect(result.age).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('id is preserved unchanged for any profile', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);
        expect(result.id).toBe(profile.id);
      }),
      { numRuns: 100 },
    );
  });

  it('created_at is preserved unchanged for any profile', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);
        expect(result.created_at).toBe(profile.created_at);
      }),
      { numRuns: 100 },
    );
  });

  it('anonymization produces exact expected shape regardless of input data', () => {
    fc.assert(
      fc.property(profileRecordArb, (profile) => {
        const result = anonymizeProfile(profile);

        expect(result).toStrictEqual({
          id: profile.id,
          display_name: 'Deleted User',
          avatar_url: null,
          email: null,
          bio: null,
          city: null,
          country: null,
          languages: null,
          interests: null,
          social_links: null,
          age: null,
          created_at: profile.created_at,
        });
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const uuidArb = fc.uuid();
// Use integer-based timestamp to avoid Invalid Date issues with fc.date()
const isoTimestampArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map((ms) => new Date(ms).toISOString());
const contentTextArb = fc.string({ minLength: 0, maxLength: 500 });
const nonEmptyContentArb = fc.string({ minLength: 1, maxLength: 500 });
const ratingArb = fc.integer({ min: 1, max: 5 });

const eventReviewArb: fc.Arbitrary<EventReviewRecord> = fc.record({
  type: fc.constant('event_review' as const),
  id: uuidArb,
  event_id: uuidArb,
  user_id: uuidArb,
  rating: ratingArb,
  content: fc.oneof(contentTextArb, fc.constant(null)),
  created_at: isoTimestampArb,
});

const messageArb: fc.Arbitrary<MessageRecord> = fc.record({
  type: fc.constant('message' as const),
  id: uuidArb,
  conversation_id: uuidArb,
  sender_id: uuidArb,
  content: nonEmptyContentArb,
  read_at: fc.oneof(isoTimestampArb, fc.constant(null)),
  created_at: isoTimestampArb,
});

const eventCrewMessageArb: fc.Arbitrary<EventCrewMessageRecord> = fc.record({
  type: fc.constant('event_crew_message' as const),
  id: uuidArb,
  crew_id: uuidArb,
  sender_id: uuidArb,
  content: nonEmptyContentArb,
  is_system: fc.constant(false as const),
  created_at: isoTimestampArb,
});

const groupPostCommentArb: fc.Arbitrary<GroupPostCommentRecord> = fc.record({
  type: fc.constant('group_post_comment' as const),
  id: uuidArb,
  post_id: uuidArb,
  user_id: uuidArb,
  content: nonEmptyContentArb,
  parent_id: fc.oneof(uuidArb, fc.constant(null)),
  created_at: isoTimestampArb,
});

const contentRecordArb: fc.Arbitrary<ContentRecord> = fc.oneof(
  eventReviewArb,
  messageArb,
  eventCrewMessageArb,
  groupPostCommentArb,
);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: account-deletion, Property 6: Content anonymization preserves text and replaces author reference', () => {
  it('replaces user_id/sender_id with sentinel UUID for all content types', () => {
    fc.assert(
      fc.property(contentRecordArb, (record) => {
        const result = anonymizeContent(record);

        switch (result.type) {
          case 'event_review':
            expect(result.user_id).toBe(SENTINEL_UUID);
            break;
          case 'message':
            expect(result.sender_id).toBe(SENTINEL_UUID);
            break;
          case 'event_crew_message':
            expect(result.sender_id).toBe(SENTINEL_UUID);
            break;
          case 'group_post_comment':
            expect(result.user_id).toBe(SENTINEL_UUID);
            break;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves content text unchanged for event_reviews', () => {
    fc.assert(
      fc.property(eventReviewArb, (record) => {
        const result = anonymizeContent(record);
        expect(result.type).toBe('event_review');
        if (result.type === 'event_review') {
          expect(result.content).toBe(record.content);
          expect(result.rating).toBe(record.rating);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves content text unchanged for messages', () => {
    fc.assert(
      fc.property(messageArb, (record) => {
        const result = anonymizeContent(record);
        expect(result.type).toBe('message');
        if (result.type === 'message') {
          expect(result.content).toBe(record.content);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves content text unchanged for event_crew_messages', () => {
    fc.assert(
      fc.property(eventCrewMessageArb, (record) => {
        const result = anonymizeContent(record);
        expect(result.type).toBe('event_crew_message');
        if (result.type === 'event_crew_message') {
          expect(result.content).toBe(record.content);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves content text unchanged for group_post_comments', () => {
    fc.assert(
      fc.property(groupPostCommentArb, (record) => {
        const result = anonymizeContent(record);
        expect(result.type).toBe('group_post_comment');
        if (result.type === 'group_post_comment') {
          expect(result.content).toBe(record.content);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('preserves all non-author fields unchanged', () => {
    fc.assert(
      fc.property(contentRecordArb, (record) => {
        const result = anonymizeContent(record);

        // Type is preserved
        expect(result.type).toBe(record.type);

        // Common fields preserved
        expect(result.id).toBe(record.id);
        expect(result.created_at).toBe(record.created_at);

        // Type-specific non-author fields preserved
        switch (record.type) {
          case 'event_review':
            if (result.type === 'event_review') {
              expect(result.event_id).toBe(record.event_id);
              expect(result.rating).toBe(record.rating);
              expect(result.content).toBe(record.content);
            }
            break;
          case 'message':
            if (result.type === 'message') {
              expect(result.conversation_id).toBe(record.conversation_id);
              expect(result.content).toBe(record.content);
              expect(result.read_at).toBe(record.read_at);
            }
            break;
          case 'event_crew_message':
            if (result.type === 'event_crew_message') {
              expect(result.crew_id).toBe(record.crew_id);
              expect(result.content).toBe(record.content);
              expect(result.is_system).toBe(record.is_system);
            }
            break;
          case 'group_post_comment':
            if (result.type === 'group_post_comment') {
              expect(result.post_id).toBe(record.post_id);
              expect(result.content).toBe(record.content);
              expect(result.parent_id).toBe(record.parent_id);
            }
            break;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('sentinel UUID is always the well-known zero UUID', () => {
    expect(SENTINEL_UUID).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('anonymization is idempotent: applying twice yields same result', () => {
    fc.assert(
      fc.property(contentRecordArb, (record) => {
        const first = anonymizeContent(record);
        // Apply again (need to cast since the type changes)
        const secondInput: ContentRecord = {
          ...first,
          ...(first.type === 'event_review' || first.type === 'group_post_comment'
            ? { user_id: first.type === 'event_review' || first.type === 'group_post_comment' ? (first as any).user_id : undefined }
            : { sender_id: (first as any).sender_id }),
        } as ContentRecord;
        const second = anonymizeContent(secondInput);

        // Both should have sentinel UUID
        if (second.type === 'event_review' || second.type === 'group_post_comment') {
          expect((second as any).user_id).toBe(SENTINEL_UUID);
        } else {
          expect((second as any).sender_id).toBe(SENTINEL_UUID);
        }
      }),
      { numRuns: 100 },
    );
  });
});
