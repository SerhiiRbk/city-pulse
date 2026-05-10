/**
 * Feature: system-event-rsvp-unification, Property 6: Crew always enabled for system events
 *
 * For any system event, regardless of stored `allow_crews` value, crew creation
 * is treated as enabled. The condition `isSystemEvent || event.allow_crews` always
 * evaluates to true when `is_system = true`.
 *
 * **Validates: Requirements 6.1**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock next/cache before importing the module under test
vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

/**
 * Simulates the crew enablement check used in the codebase:
 * - Server action (crew.ts): `if (!ev.is_system && !ev.allow_crews)` rejects
 * - UI rendering (page.tsx): `isSystemEvent || event.allow_crews` shows block
 *
 * Both are logically equivalent to: `is_system || allow_crews`
 * For system events, this must ALWAYS be true regardless of allow_crews.
 */
function isCrewEnabled(isSystem: boolean, allowCrews: boolean): boolean {
  return isSystem || allowCrews;
}

/**
 * Simulates the server-side guard from createCrew in crew.ts:
 * Returns true if crew creation is BLOCKED.
 */
function isCrewBlocked(isSystem: boolean, allowCrews: boolean): boolean {
  return !isSystem && !allowCrews;
}

// Arbitrary generators
const allowCrewsArb = fc.boolean();
const eventIdArb = fc.uuid();
const userIdArb = fc.uuid();

describe('Feature: system-event-rsvp-unification, Property 6: Crew always enabled for system events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UI crew enablement condition is always true for system events regardless of allow_crews', async () => {
    fc.assert(
      fc.property(allowCrewsArb, (allowCrews) => {
        // For system events (is_system = true), crew should always be enabled
        const result = isCrewEnabled(true, allowCrews);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('server-side crew creation is never blocked for system events regardless of allow_crews', async () => {
    fc.assert(
      fc.property(allowCrewsArb, (allowCrews) => {
        // For system events, crew creation should never be blocked
        const blocked = isCrewBlocked(true, allowCrews);
        expect(blocked).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('createCrew does not reject system events due to allow_crews being false', async () => {
    // Dynamically import createCrew to ensure mocks are in place
    const { createCrew } = await import('@/lib/actions/crew');

    await fc.assert(
      fc.asyncProperty(eventIdArb, userIdArb, allowCrewsArb, async (eventId, userId, allowCrews) => {
        const mockClient = buildCrewMockClient({
          userId,
          eventId,
          isSystem: true,
          allowCrews,
        });
        mockedCreateClient.mockResolvedValue(mockClient as any);

        const result = await createCrew({
          event_id: eventId,
          name: 'Test Crew Name',
          capacity: 4,
          languages: [],
          visibility: 'public',
        });

        // The result should NOT be the "does not allow crews" error
        // (it may have other errors like "already in a crew" but never the allow_crews rejection)
        expect(result.error).not.toBe('This event does not allow crews');
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Creates a mock Supabase client for testing createCrew behavior.
 * Simulates a system event with the given allow_crews value.
 */
function buildCrewMockClient(opts: {
  userId: string;
  eventId: string;
  isSystem: boolean;
  allowCrews: boolean;
}) {
  const { userId, eventId, isSystem, allowCrews } = opts;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: eventId,
              organizer_id: 'some-other-user-id', // Not the current user
              is_system: isSystem,
              allow_crews: allowCrews,
              title: 'Test System Event',
            },
            error: null,
          }),
        };
      }

      if (table === 'event_crew_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [], // User is not in any crew for this event
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'event_crews') {
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.count === 'exact') {
            // This is the active crew count check
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
            };
          }
          return builder;
        });
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockResolvedValue({
          data: {
            id: 'new-crew-id',
            event_id: eventId,
            host_id: userId,
            name: 'Test Crew Name',
            description: '',
            capacity: null,
            languages: null,
            visibility: 'public',
            status: 'active',
            participant_count: 1,
          },
          error: null,
        });
        builder.insert = vi.fn().mockReturnValue(builder);
        builder.delete = vi.fn().mockReturnValue(builder);
        return builder;
      }

      if (table === 'event_crew_messages') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      // Default fallback
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  };

  return mockClient;
}
