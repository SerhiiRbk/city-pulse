/**
 * Feature: system-event-rsvp-unification, Property 3: System events reject interested status
 *
 * **Validates: Requirements 3.3**
 *
 * After migration and code changes, no code path can create a record with
 * `status = 'interested'` for a system event. This property verifies:
 * 1. toggleAttendance for a system event only produces 'going' or 'none'
 * 2. The removed setInterest function no longer exists as an export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// We need to mock the Supabase client before importing the module under test
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Feature: system-event-rsvp-unification, Property 3: System events reject interested status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('toggleAttendance for system events never produces interested status', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    await fc.assert(
      fc.asyncProperty(
        // Generate random event IDs (UUIDs)
        fc.uuid(),
        // Generate random user IDs (UUIDs)
        fc.uuid(),
        // Generate random existing status scenarios
        fc.option(
          fc.constantFrom('going', 'waitlist', 'interested', 'attended', 'no_show', 'cancelled'),
          { nil: undefined },
        ),
        async (eventId, userId, existingStatus) => {
          // Build a mock Supabase client that simulates a system event
          const mockSupabase = buildMockSupabase({
            userId,
            eventId,
            isSystem: true,
            existingStatus: existingStatus ?? null,
          });

          vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

          // Dynamically import to get fresh module with mocked dependencies
          const { toggleAttendance } = await import('@/lib/actions/events');

          const result = await toggleAttendance(eventId);

          // The result status must never be 'interested' for a system event
          if (result.status) {
            expect(result.status).not.toBe('interested');
            // For system events, only 'going' or 'none' are valid outcomes
            expect(['going', 'none']).toContain(result.status);
          }
          // If there's an error, it should be auth-related, not a status issue
          if (result.error) {
            expect(result.error).toBe('Not authenticated');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('setInterest is not exported from the events module', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const eventsModule = await import('@/lib/actions/events');

        // Verify setInterest does not exist as an export
        expect('setInterest' in eventsModule).toBe(false);
        expect((eventsModule as Record<string, unknown>).setInterest).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Helper to build a mock Supabase client that simulates database responses
 * for system event attendance scenarios.
 */
function buildMockSupabase(opts: {
  userId: string;
  eventId: string;
  isSystem: boolean;
  existingStatus: string | null;
}) {
  const { userId, eventId, isSystem, existingStatus } = opts;

  // Track what status gets upserted to verify no 'interested' is written
  const chainable = (resolveValue: unknown) => {
    const chain: Record<string, any> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.in = () => chain;
    chain.single = () => Promise.resolve({ data: resolveValue, error: null });
    chain.delete = () => chain;
    chain.upsert = (record: any) => {
      // Verify the upserted status is never 'interested' for system events
      if (isSystem && record?.status === 'interested') {
        throw new Error('PROPERTY VIOLATION: attempted to upsert interested status for system event');
      }
      chain._upsertedRecord = record;
      return chain;
    };
    return chain;
  };

  const fromHandlers: Record<string, () => ReturnType<typeof chainable>> = {
    events: () => chainable({ is_system: isSystem }),
    event_attendees: () => {
      const base = chainable(
        existingStatus ? { status: existingStatus } : null,
      );
      // Override upsert to return the inserted record with 'going' status
      const originalUpsert = base.upsert;
      base.upsert = (record: any) => {
        originalUpsert(record);
        // Simulate DB returning the upserted record
        base.single = () =>
          Promise.resolve({ data: { status: record.status }, error: null });
        return base;
      };
      return base;
    },
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: userId } }, error: null }),
    },
    from: (table: string) => {
      const handler = fromHandlers[table];
      if (handler) return handler();
      return chainable(null);
    },
  };
}
