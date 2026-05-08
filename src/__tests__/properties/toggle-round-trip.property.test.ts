/**
 * Feature: system-event-rsvp-unification, Property 1: Toggle round-trip
 *
 * For any system event and authenticated user, calling `toggleAttendance` once
 * results in status 'going', calling again results in status 'none'.
 *
 * **Validates: Requirements 1.1, 1.2**
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

// We'll mock the createClient at the module level
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { toggleAttendance } from '@/lib/actions/events';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

/**
 * Creates a mock Supabase client that simulates the toggle behavior.
 * On first call (no existing record): upserts 'going'
 * On second call (existing 'going' record): deletes and returns 'none'
 */
function buildMockSupabaseClient(opts: {
  userId: string;
  eventId: string;
  isSystem: boolean;
  hasExistingGoingRecord: boolean;
}) {
  const { userId, eventId, isSystem, hasExistingGoingRecord } = opts;

  // Track chained query builder calls
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
            data: { is_system: isSystem },
            error: null,
          }),
        };
      }

      if (table === 'event_attendees') {
        // Build a chainable query builder for event_attendees
        const builder: Record<string, any> = {};

        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockResolvedValue({
          data: hasExistingGoingRecord ? { status: 'going' } : null,
          error: hasExistingGoingRecord ? null : { code: 'PGRST116' },
        });

        // For delete operations
        builder.delete = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

        // For upsert operations
        builder.upsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'going' },
              error: null,
            }),
          }),
        });

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

// Arbitrary generators
const eventIdArb = fc.uuid();
const userIdArb = fc.uuid();

describe('Feature: system-event-rsvp-unification, Property 1: Toggle round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggleAttendance once on system event → going, toggle again → none', async () => {
    await fc.assert(
      fc.asyncProperty(eventIdArb, userIdArb, async (eventId, userId) => {
        // --- First toggle: no existing record → should return 'going' ---
        const mockClient1 = buildMockSupabaseClient({
          userId,
          eventId,
          isSystem: true,
          hasExistingGoingRecord: false,
        });
        mockedCreateClient.mockResolvedValue(mockClient1 as any);

        const result1 = await toggleAttendance(eventId);
        expect(result1.error).toBeUndefined();
        expect(result1.status).toBe('going');

        // --- Second toggle: existing 'going' record → should return 'none' ---
        const mockClient2 = buildMockSupabaseClient({
          userId,
          eventId,
          isSystem: true,
          hasExistingGoingRecord: true,
        });
        mockedCreateClient.mockResolvedValue(mockClient2 as any);

        const result2 = await toggleAttendance(eventId);
        expect(result2.error).toBeUndefined();
        expect(result2.status).toBe('none');
      }),
      { numRuns: 100 },
    );
  });
});
