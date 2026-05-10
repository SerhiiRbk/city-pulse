/**
 * Feature: contacts-replace-subscriptions, Property 1: Friends-going returns only contacts who are attending
 *
 * For any authenticated user with any set of contacts and any event with any set of attendees,
 * `getFriendsGoing` SHALL return only users who are both in the viewer's `user_contacts`
 * (as `contact_id`) AND in the event's `event_attendees` with status going/waitlist/interested.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
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

import { getFriendsGoing } from '@/lib/actions/friends-going';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

type ValidStatus = 'going' | 'waitlist' | 'interested';
const VALID_STATUSES: ValidStatus[] = ['going', 'waitlist', 'interested'];

interface Attendee {
  user_id: string;
  status: ValidStatus;
  created_at: string;
}

/**
 * Creates a mock Supabase client that returns the given contacts and attendees.
 */
function buildMockClient(opts: {
  currentUserId: string;
  contactIds: string[];
  attendees: Attendee[];
}) {
  const { currentUserId, contactIds, attendees } = opts;

  // Collect all user IDs that might need profiles
  const allUserIds = new Set(attendees.map((a) => a.user_id));

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: currentUserId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_contacts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: contactIds.map((id) => ({ contact_id: id })),
              error: null,
            }),
          }),
        };
      }

      if (table === 'event_attendees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: attendees.map((a) => ({
                  user_id: a.user_id,
                  status: a.status,
                  created_at: a.created_at,
                })),
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: Array.from(allUserIds).map((uid) => ({
                id: uid,
                display_name: `User ${uid.slice(0, 8)}`,
                avatar_url: null,
              })),
              error: null,
            }),
          }),
        };
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
const userIdArb = fc.uuid();
const eventIdArb = fc.uuid();
const contactIdsArb = fc.array(fc.uuid(), { minLength: 0, maxLength: 10 });
const statusArb = fc.constantFrom<ValidStatus>(...VALID_STATUSES);
const timestampArb = fc
  .integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2030-01-01').getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

const attendeeArb = fc.record({
  user_id: fc.uuid(),
  status: statusArb,
  created_at: timestampArb,
});

const attendeesArb = fc.array(attendeeArb, { minLength: 0, maxLength: 15 });

describe('Feature: contacts-replace-subscriptions, Property 1: Friends-going returns only contacts who are attending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only users who are in both contacts AND attendees with valid statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        contactIdsArb,
        attendeesArb,
        async (eventId, currentUserId, contactIds, attendees) => {
          // Ensure current user is not in contacts or attendees (realistic scenario)
          const filteredContacts = contactIds.filter((id) => id !== currentUserId);
          const filteredAttendees = attendees.filter((a) => a.user_id !== currentUserId);

          // Deduplicate attendees by user_id (keep first occurrence)
          const seenUserIds = new Set<string>();
          const uniqueAttendees = filteredAttendees.filter((a) => {
            if (seenUserIds.has(a.user_id)) return false;
            seenUserIds.add(a.user_id);
            return true;
          });

          const mockClient = buildMockClient({
            currentUserId,
            contactIds: filteredContacts,
            attendees: uniqueAttendees,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getFriendsGoing(eventId, 100); // large max to get all results

          // Compute expected intersection: contacts ∩ attendees
          const contactSet = new Set(filteredContacts);
          const expectedUserIds = new Set(
            uniqueAttendees
              .filter((a) => contactSet.has(a.user_id))
              .map((a) => a.user_id),
          );

          const resultUserIds = new Set(result.map((r) => r.user_id));

          // Property: result is exactly the intersection
          expect(resultUserIds).toEqual(expectedUserIds);

          // Property: every returned user has a valid status
          for (const friend of result) {
            expect(VALID_STATUSES).toContain(friend.status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when user has zero contacts', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        attendeesArb,
        async (eventId, currentUserId, attendees) => {
          const filteredAttendees = attendees.filter((a) => a.user_id !== currentUserId);

          const mockClient = buildMockClient({
            currentUserId,
            contactIds: [], // zero contacts
            attendees: filteredAttendees,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getFriendsGoing(eventId, 100);

          // Property: zero contacts → empty result
          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when no attendees match contacts', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        contactIdsArb,
        attendeesArb,
        async (eventId, currentUserId, contactIds, attendees) => {
          // Ensure no overlap: filter attendees to exclude any contact IDs
          const contactSet = new Set(contactIds);
          const disjointAttendees = attendees.filter(
            (a) => !contactSet.has(a.user_id) && a.user_id !== currentUserId,
          );

          const filteredContacts = contactIds.filter((id) => id !== currentUserId);

          // Skip if contacts are empty (covered by other test)
          if (filteredContacts.length === 0) return;

          const mockClient = buildMockClient({
            currentUserId,
            contactIds: filteredContacts,
            attendees: disjointAttendees,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getFriendsGoing(eventId, 100);

          // Property: no overlap → empty result
          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
