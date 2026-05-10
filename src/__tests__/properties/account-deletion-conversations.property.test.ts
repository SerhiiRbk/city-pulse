/**
 * Feature: account-deletion, Property 9: All active conversations are closed on soft delete
 *
 * For any set of conversations where the deleted user is participant_1 or participant_2
 * and status is 'active', all SHALL transition to status = 'closed'.
 * Conversations with status = 'pending' SHALL transition to 'declined'.
 * Other statuses remain unchanged.
 *
 * **Validates: Requirements 8.1, 8.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyConversationTransitions,
  type Conversation,
  type ConversationStatus,
} from '@/lib/deletion/classification';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

const conversationStatusArb: fc.Arbitrary<ConversationStatus> = fc.constantFrom(
  'active',
  'pending',
  'closed',
  'declined'
);

const userIdArb = fc.uuid();

/**
 * Generate a conversation where the deleted user is always a participant
 * (either participant_1 or participant_2).
 */
const conversationForUserArb = (userId: string): fc.Arbitrary<Conversation> =>
  fc
    .tuple(fc.uuid(), conversationStatusArb, userIdArb, fc.boolean())
    .map(([id, status, otherUser, isParticipant1]) => ({
      id,
      status,
      participant_1: isParticipant1 ? userId : otherUser,
      participant_2: isParticipant1 ? otherUser : userId,
    }));

/**
 * Generate a conversation where the deleted user is NOT a participant.
 */
const conversationNotForUserArb = (userId: string): fc.Arbitrary<Conversation> =>
  fc
    .tuple(fc.uuid(), conversationStatusArb, userIdArb, userIdArb)
    .filter(([, , p1, p2]) => p1 !== userId && p2 !== userId)
    .map(([id, status, p1, p2]) => ({
      id,
      status,
      participant_1: p1,
      participant_2: p2,
    }));

/**
 * Generate a mixed set of conversations — some involving the user, some not.
 */
const conversationSetArb = (userId: string) =>
  fc.tuple(
    fc.array(conversationForUserArb(userId), { minLength: 0, maxLength: 15 }),
    fc.array(conversationNotForUserArb(userId), { minLength: 0, maxLength: 5 })
  ).map(([forUser, notForUser]) => [...forUser, ...notForUser]);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: account-deletion, Property 9: All active conversations are closed on soft delete', () => {
  const FIXED_USER_ID = '11111111-1111-1111-1111-111111111111';

  it('active conversations transition to closed', () => {
    fc.assert(
      fc.property(
        fc.array(conversationForUserArb(FIXED_USER_ID), { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = classifyConversationTransitions(conversations, FIXED_USER_ID);

          for (const classified of result) {
            if (classified.conversation.status === 'active') {
              expect(classified.newStatus).toBe('closed');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pending conversations transition to declined', () => {
    fc.assert(
      fc.property(
        fc.array(conversationForUserArb(FIXED_USER_ID), { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = classifyConversationTransitions(conversations, FIXED_USER_ID);

          for (const classified of result) {
            if (classified.conversation.status === 'pending') {
              expect(classified.newStatus).toBe('declined');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('already closed or declined conversations remain unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(conversationForUserArb(FIXED_USER_ID), { minLength: 1, maxLength: 20 }),
        (conversations) => {
          const result = classifyConversationTransitions(conversations, FIXED_USER_ID);

          for (const classified of result) {
            const original = classified.conversation.status;
            if (original === 'closed' || original === 'declined') {
              expect(classified.newStatus).toBe(original);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('conversations where user is not a participant remain unchanged', () => {
    fc.assert(
      fc.property(conversationSetArb(FIXED_USER_ID), (conversations) => {
        const result = classifyConversationTransitions(conversations, FIXED_USER_ID);

        for (const classified of result) {
          const conv = classified.conversation;
          const isParticipant =
            conv.participant_1 === FIXED_USER_ID || conv.participant_2 === FIXED_USER_ID;

          if (!isParticipant) {
            expect(classified.newStatus).toBe(conv.status);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('output length equals input length — no conversations are lost or duplicated', () => {
    fc.assert(
      fc.property(conversationSetArb(FIXED_USER_ID), (conversations) => {
        const result = classifyConversationTransitions(conversations, FIXED_USER_ID);
        expect(result.length).toBe(conversations.length);
      }),
      { numRuns: 100 }
    );
  });

  it('every conversation is classified with the correct rule', () => {
    fc.assert(
      fc.property(conversationSetArb(FIXED_USER_ID), (conversations) => {
        const result = classifyConversationTransitions(conversations, FIXED_USER_ID);

        for (const classified of result) {
          const conv = classified.conversation;
          const isParticipant =
            conv.participant_1 === FIXED_USER_ID || conv.participant_2 === FIXED_USER_ID;

          if (!isParticipant) {
            expect(classified.newStatus).toBe(conv.status);
          } else if (conv.status === 'active') {
            expect(classified.newStatus).toBe('closed');
          } else if (conv.status === 'pending') {
            expect(classified.newStatus).toBe('declined');
          } else {
            expect(classified.newStatus).toBe(conv.status);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});


// ─── Property 10: Closed conversations allow read-only access ────────────────

import { classifyConversationPermissions } from '@/lib/deletion/classification';

/**
 * Feature: account-deletion, Property 10: Closed conversations allow read-only access
 *
 * For any conversation with status = 'closed', the remaining participant SHALL be able
 * to read all messages but SHALL NOT be able to insert new messages or delete existing messages.
 *
 * **Validates: Requirements 8.2**
 */
describe('Feature: account-deletion, Property 10: Closed conversations allow read-only access', () => {
  const actionArb: fc.Arbitrary<'read' | 'write' | 'delete'> = fc.constantFrom(
    'read',
    'write',
    'delete'
  );

  it('read is always allowed regardless of conversation status', () => {
    fc.assert(
      fc.property(conversationStatusArb, (status) => {
        const result = classifyConversationPermissions({ status }, 'read');
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('write is blocked for closed conversations', () => {
    fc.assert(
      fc.property(fc.constant('closed' as ConversationStatus), (status) => {
        const result = classifyConversationPermissions({ status }, 'write');
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('delete is blocked for closed conversations', () => {
    fc.assert(
      fc.property(fc.constant('closed' as ConversationStatus), (status) => {
        const result = classifyConversationPermissions({ status }, 'delete');
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('write and delete are blocked for closed, pending, and declined statuses', () => {
    const nonActiveStatusArb: fc.Arbitrary<ConversationStatus> = fc.constantFrom(
      'closed',
      'pending',
      'declined'
    );
    const writeOrDeleteArb: fc.Arbitrary<'write' | 'delete'> = fc.constantFrom('write', 'delete');

    fc.assert(
      fc.property(nonActiveStatusArb, writeOrDeleteArb, (status, action) => {
        const result = classifyConversationPermissions({ status }, action);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('write and delete are allowed only for active conversations', () => {
    const writeOrDeleteArb: fc.Arbitrary<'write' | 'delete'> = fc.constantFrom('write', 'delete');

    fc.assert(
      fc.property(writeOrDeleteArb, (action) => {
        const result = classifyConversationPermissions({ status: 'active' }, action);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('for any status and action, permission is correctly classified', () => {
    fc.assert(
      fc.property(conversationStatusArb, actionArb, (status, action) => {
        const result = classifyConversationPermissions({ status }, action);

        if (action === 'read') {
          expect(result).toBe(true);
        } else if (status === 'active') {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
