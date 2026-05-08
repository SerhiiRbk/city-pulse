/**
 * Feature: system-event-rsvp-unification, Property 2: No capacity restriction for system events
 *
 * For any system event, regardless of existing attendee count,
 * `toggleAttendance` always results in 'going', never 'waitlist'.
 *
 * **Validates: Requirements 2.1, 2.2**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
}));

// Mock next/headers (needed by createClient)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: () => {},
  })),
}));

import { createClient } from '@/lib/supabase/server';
import { toggleAttendance } from '../events';

const mockedCreateClient = vi.mocked(createClient);

/**
 * Creates a mock Supabase client that simulates:
 * - An authenticated user
 * - A system event (is_system = true)
 * - No existing attendance record for the user
 * - The upsert always returns 'going'
 *
 * @param attendeeCount - The number of existing attendees (irrelevant for system events)
 */
function createMockSupabaseClient(attendeeCount: number) {
  const userId = 'test-user-id';

  // Build chainable query mock
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { is_system: true },
            error: null,
          }),
        };
      }
      if (table === 'event_attendees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // No existing attendance record
                  error: null,
                }),
              }),
            }),
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: 'going' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  return mockClient;
}

describe('Feature: system-event-rsvp-unification, Property 2: No capacity restriction for system events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('for any system event, regardless of existing attendee count, toggleAttendance always results in going, never waitlist', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random event ID (UUID-like)
        fc.uuid(),
        // Generate a random attendee count (0 to a large number)
        fc.nat({ max: 10000 }),
        async (eventId, attendeeCount) => {
          // Setup mock with the given attendee count
          const mockClient = createMockSupabaseClient(attendeeCount);
          mockedCreateClient.mockResolvedValue(mockClient as any);

          // Call toggleAttendance
          const result = await toggleAttendance(eventId);

          // Property: result should always be 'going', never 'waitlist'
          expect(result.status).toBe('going');
          expect(result.status).not.toBe('waitlist');
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
