/**
 * Feature: system-event-rsvp-unification, Property 7: Going users enter interaction pool
 *
 * For any user with status 'going' on a system event, that user is included in
 * the Crew interaction pool for that event, enabling matching with other 'going' users.
 *
 * **Validates: Requirements 6.2, 6.3**
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

import { getInteractionPool } from '@/lib/actions/contacts';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

/**
 * Creates a mock Supabase client that simulates the interaction pool scenario:
 * - The current user has 'going' status on a system event
 * - Other users also have 'going' status on the same system event
 * - Those other users should appear in the interaction pool
 */
function buildInteractionPoolMockClient(opts: {
  currentUserId: string;
  eventId: string;
  goingUserIds: string[]; // other users with 'going' on the same event
}) {
  const { currentUserId, eventId, goingUserIds } = opts;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: currentUserId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'event_crew_members') {
        // No crew memberships — isolate the "going RSVP" path
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }

      if (table === 'conversations') {
        // No active conversations — isolate the "going RSVP" path
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'event_attendees') {
        // This table is queried twice:
        // 1. First to get the current user's events with 'going' status
        // 2. Then to get co-attendees on those events
        const builder: Record<string, any> = {};
        let isCurrentUserQuery = true;

        builder.select = vi.fn().mockImplementation(() => {
          return builder;
        });

        builder.eq = vi.fn().mockImplementation((col: string, val: string) => {
          if (col === 'user_id' && val === currentUserId) {
            isCurrentUserQuery = true;
          }
          if (col === 'user_id' && val !== currentUserId) {
            isCurrentUserQuery = false;
          }
          return builder;
        });

        builder.neq = vi.fn().mockImplementation(() => {
          isCurrentUserQuery = false;
          return builder;
        });

        builder.in = vi.fn().mockImplementation(() => {
          return builder;
        });

        // When the query resolves, return appropriate data
        // We use a proxy pattern: the mock resolves based on the query context
        // The getInteractionPool function awaits the query directly (no .then)
        // so we need the builder itself to be thenable
        builder.then = vi.fn().mockImplementation(
          (resolve: (val: any) => void) => {
            if (isCurrentUserQuery) {
              // Current user's events with 'going' status
              resolve({
                data: [{ event_id: eventId }],
                error: null,
              });
            } else {
              // Co-attendees on those events
              resolve({
                data: goingUserIds.map((uid) => ({ user_id: uid })),
                error: null,
              });
            }
          },
        );

        return builder;
      }

      if (table === 'profiles') {
        // Return profiles for the pool users
        const profileBuilder: Record<string, any> = {};
        profileBuilder.select = vi.fn().mockReturnValue(profileBuilder);
        profileBuilder.in = vi.fn().mockReturnValue(profileBuilder);
        profileBuilder.limit = vi.fn().mockReturnValue(profileBuilder);
        profileBuilder.ilike = vi.fn().mockReturnValue(profileBuilder);
        profileBuilder.order = vi.fn().mockResolvedValue({
          data: goingUserIds.map((uid) => ({
            id: uid,
            display_name: `User ${uid.slice(0, 8)}`,
            avatar_url: null,
          })),
          error: null,
        });

        return profileBuilder;
      }

      // Default fallback
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  return mockClient;
}

// Arbitrary generators
const eventIdArb = fc.uuid();
const userIdArb = fc.uuid();
// Generate 1-5 other users who are also 'going'
const goingUsersArb = fc.array(fc.uuid(), { minLength: 1, maxLength: 5 });

describe('Feature: system-event-rsvp-unification, Property 7: Going users enter interaction pool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('users with going status on a system event appear in the interaction pool for that event', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        goingUsersArb,
        async (eventId, currentUserId, goingUserIds) => {
          // Ensure current user is not in the going users list
          const filteredGoingUsers = goingUserIds.filter(
            (uid) => uid !== currentUserId,
          );
          if (filteredGoingUsers.length === 0) return; // skip trivial case

          const mockClient = buildInteractionPoolMockClient({
            currentUserId,
            eventId,
            goingUserIds: filteredGoingUsers,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getInteractionPool({ event_id: eventId });

          // All users with 'going' status should be in the pool
          expect(result.error).toBeUndefined();
          const poolIds = result.users.map((u) => u.id);
          for (const goingUserId of filteredGoingUsers) {
            expect(poolIds).toContain(goingUserId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a single user with going status on a system event is included in the interaction pool', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        userIdArb,
        async (eventId, currentUserId, goingUserId) => {
          // Ensure they are different users
          if (currentUserId === goingUserId) return;

          const mockClient = buildInteractionPoolMockClient({
            currentUserId,
            eventId,
            goingUserIds: [goingUserId],
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getInteractionPool({ event_id: eventId });

          // The going user should be in the pool
          expect(result.error).toBeUndefined();
          const poolIds = result.users.map((u) => u.id);
          expect(poolIds).toContain(goingUserId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
