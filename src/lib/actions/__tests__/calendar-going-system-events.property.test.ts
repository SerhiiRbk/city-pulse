/**
 * Feature: system-event-rsvp-unification, Property 5: Calendar returns going system events sorted by time
 *
 * For any user with 'going' records on system events, `getProfileGoingSystemEvents`
 * returns exactly those upcoming system events ordered by `starts_at` ascending.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock next/cache
vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: () => {},
  })),
}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getProfileGoingSystemEvents } from '../profile-data';

const mockedCreateClient = vi.mocked(createClient);

// --- Arbitrary generators ---

/** Generate a random event with system/non-system flag and time boundaries */
interface GeneratedEvent {
  id: string;
  is_system: boolean;
  is_blocked: boolean;
  organizer_is_blocked: boolean;
  starts_at: string;
  ends_at: string;
  title: string;
}

interface AttendeeRecord {
  event_id: string;
  status: 'going' | 'interested' | 'waitlist';
}

interface FavoriteRecord {
  event_id: string;
}

/** Generate a date in the future (1 hour to 365 days from now) */
const futureDateArb = fc.integer({ min: 1, max: 365 * 24 }).map((hoursAhead) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return d;
});

/** Generate a date in the past (1 hour to 30 days ago) */
const pastDateArb = fc.integer({ min: 1, max: 30 * 24 }).map((hoursAgo) => {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d;
});

/** Generate a system event (upcoming or past) */
const systemEventArb = (isPast: boolean): fc.Arbitrary<GeneratedEvent> =>
  fc.record({
    id: fc.uuid(),
    is_system: fc.constant(true),
    is_blocked: fc.constant(false),
    organizer_is_blocked: fc.constant(false),
    starts_at: isPast
      ? pastDateArb.map((d) => d.toISOString())
      : futureDateArb.map((d) => d.toISOString()),
    ends_at: isPast
      ? pastDateArb.map((d) => d.toISOString())
      : futureDateArb.map((d) => {
          // ends_at is always after starts_at
          const end = new Date(d);
          end.setHours(end.getHours() + 2);
          return end.toISOString();
        }),
    title: fc.string({ minLength: 1, maxLength: 50 }),
  });

/** Generate a non-system (community) event */
const communityEventArb: fc.Arbitrary<GeneratedEvent> = fc.record({
  id: fc.uuid(),
  is_system: fc.constant(false),
  is_blocked: fc.constant(false),
  organizer_is_blocked: fc.constant(false),
  starts_at: futureDateArb.map((d) => d.toISOString()),
  ends_at: futureDateArb.map((d) => {
    const end = new Date(d);
    end.setHours(end.getHours() + 2);
    return end.toISOString();
  }),
  title: fc.string({ minLength: 1, maxLength: 50 }),
});

/** Generate a blocked system event */
const blockedSystemEventArb: fc.Arbitrary<GeneratedEvent> = fc.record({
  id: fc.uuid(),
  is_system: fc.constant(true),
  is_blocked: fc.boolean(),
  organizer_is_blocked: fc.boolean(),
  starts_at: futureDateArb.map((d) => d.toISOString()),
  ends_at: futureDateArb.map((d) => {
    const end = new Date(d);
    end.setHours(end.getHours() + 2);
    return end.toISOString();
  }),
  title: fc.string({ minLength: 1, maxLength: 50 }),
}).filter((e) => e.is_blocked || e.organizer_is_blocked);

/**
 * Build a mock Supabase client that simulates the two-step query in
 * `getProfileGoingSystemEvents`:
 * 1. Query event_attendees for user's 'going' records
 * 2. Query events_with_counts for matching system events
 *
 * The mock applies the same filters the real function does:
 * - is_system = true
 * - is_blocked = false
 * - organizer_is_blocked = false
 * - ends_at >= now
 * - ordered by starts_at ascending
 */
function buildMockSupabaseClient(opts: {
  attendeeRecords: AttendeeRecord[];
  allEvents: GeneratedEvent[];
}) {
  const { attendeeRecords, allEvents } = opts;

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'event_attendees') {
        // Simulate: select event_id from event_attendees where user_id = X and status = 'going'
        let filteredRecords = [...attendeeRecords];

        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockImplementation((_col: string, val: string) => {
          if (val === 'going') {
            filteredRecords = filteredRecords.filter((r) => r.status === 'going');
          }
          return builder;
        });
        // Return the filtered attendee records
        Object.defineProperty(builder, 'then', {
          value: (resolve: any) =>
            resolve({
              data: filteredRecords.map((r) => ({ event_id: r.event_id })),
              error: null,
            }),
        });

        // Make it thenable for await
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: filteredRecords
                  .filter((r) => r.status === 'going')
                  .map((r) => ({ event_id: r.event_id })),
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'events_with_counts') {
        // Simulate the chained query with filters
        const nowIso = new Date().toISOString();
        let filteredEvents = [...allEvents];
        let inIds: string[] = [];

        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockImplementation(() => builder);
        builder.in = vi.fn().mockImplementation((_col: string, ids: string[]) => {
          inIds = ids;
          filteredEvents = filteredEvents.filter((e) => ids.includes(e.id));
          return builder;
        });
        builder.eq = vi.fn().mockImplementation((col: string, val: any) => {
          if (col === 'is_system') {
            filteredEvents = filteredEvents.filter((e) => e.is_system === val);
          } else if (col === 'is_blocked') {
            filteredEvents = filteredEvents.filter((e) => e.is_blocked === val);
          } else if (col === 'organizer_is_blocked') {
            filteredEvents = filteredEvents.filter((e) => e.organizer_is_blocked === val);
          }
          return builder;
        });
        builder.gte = vi.fn().mockImplementation((col: string, val: string) => {
          if (col === 'ends_at') {
            filteredEvents = filteredEvents.filter((e) => e.ends_at >= val);
          }
          return builder;
        });
        builder.order = vi.fn().mockImplementation((col: string, opts: { ascending: boolean }) => {
          if (col === 'starts_at' && opts.ascending) {
            filteredEvents.sort(
              (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
            );
          }
          return builder;
        });

        // Make the builder thenable (for await)
        builder.then = (resolve: any) =>
          resolve({ data: filteredEvents, error: null });

        return builder;
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

describe('Feature: system-event-rsvp-unification, Property 5: Calendar returns going system events sorted by time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only upcoming system events with going status, sorted by starts_at ascending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.array(systemEventArb(false), { minLength: 0, maxLength: 5 }), // upcoming system events
        fc.array(systemEventArb(true), { minLength: 0, maxLength: 3 }), // past system events
        fc.array(communityEventArb, { minLength: 0, maxLength: 3 }), // community events
        async (userId, upcomingSystemEvents, pastSystemEvents, communityEvents) => {
          const allEvents = [...upcomingSystemEvents, ...pastSystemEvents, ...communityEvents];

          // User has 'going' status on ALL events (system + community + past)
          const attendeeRecords: AttendeeRecord[] = allEvents.map((e) => ({
            event_id: e.id,
            status: 'going' as const,
          }));

          const mockClient = buildMockSupabaseClient({
            attendeeRecords,
            allEvents,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getProfileGoingSystemEvents(userId);

          // Property 1: Only system events are returned
          for (const event of result) {
            expect(event.is_system).toBe(true);
          }

          // Property 2: Only upcoming events (ends_at >= now)
          const nowIso = new Date().toISOString();
          for (const event of result) {
            expect(event.ends_at >= nowIso).toBe(true);
          }

          // Property 3: Results are sorted by starts_at ascending
          for (let i = 1; i < result.length; i++) {
            const prev = new Date(result[i - 1].starts_at).getTime();
            const curr = new Date(result[i].starts_at).getTime();
            expect(curr).toBeGreaterThanOrEqual(prev);
          }

          // Property 4: All upcoming system events with 'going' are included
          const expectedIds = new Set(
            upcomingSystemEvents
              .filter((e) => !e.is_blocked && !e.organizer_is_blocked)
              .filter((e) => e.ends_at >= nowIso)
              .map((e) => e.id),
          );
          const resultIds = new Set(result.map((e: any) => e.id));
          expect(resultIds).toEqual(expectedIds);

          // Property 5: Community events are NOT included
          const communityIds = new Set(communityEvents.map((e) => e.id));
          for (const event of result) {
            expect(communityIds.has(event.id)).toBe(false);
          }

          // Property 6: Past system events are NOT included
          const pastIds = new Set(pastSystemEvents.map((e) => e.id));
          for (const event of result) {
            expect(pastIds.has(event.id)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('excludes events that are only favorited (no going record)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.array(systemEventArb(false), { minLength: 1, maxLength: 5 }), // system events user is going to
        fc.array(systemEventArb(false), { minLength: 1, maxLength: 5 }), // system events user only favorited
        async (userId, goingEvents, favoritedOnlyEvents) => {
          // Ensure no ID overlap between going and favorited-only events
          const goingIds = new Set(goingEvents.map((e) => e.id));
          const uniqueFavoritedOnly = favoritedOnlyEvents.filter((e) => !goingIds.has(e.id));

          if (uniqueFavoritedOnly.length === 0) return; // skip degenerate case

          const allEvents = [...goingEvents, ...uniqueFavoritedOnly];

          // User has 'going' only on goingEvents, NOT on favoritedOnlyEvents
          const attendeeRecords: AttendeeRecord[] = goingEvents.map((e) => ({
            event_id: e.id,
            status: 'going' as const,
          }));

          const mockClient = buildMockSupabaseClient({
            attendeeRecords,
            allEvents,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await getProfileGoingSystemEvents(userId);

          // Favorited-only events should NOT appear in results
          const favoritedOnlyIds = new Set(uniqueFavoritedOnly.map((e) => e.id));
          for (const event of result) {
            expect(favoritedOnlyIds.has(event.id)).toBe(false);
          }

          // All going events that are upcoming should appear
          const nowIso = new Date().toISOString();
          const expectedGoingIds = new Set(
            goingEvents
              .filter((e) => e.ends_at >= nowIso && !e.is_blocked && !e.organizer_is_blocked)
              .map((e) => e.id),
          );
          const resultIds = new Set(result.map((e: any) => e.id));
          expect(resultIds).toEqual(expectedGoingIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});
