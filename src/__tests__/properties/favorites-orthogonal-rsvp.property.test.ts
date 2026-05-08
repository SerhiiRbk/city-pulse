/**
 * Feature: system-event-rsvp-unification, Property 4: Favorites orthogonal to RSVP
 *
 * For any event (system or community) and any user, toggling the favorite status
 * does not affect the user's attendance record in event_attendees, and toggling
 * attendance does not affect the user's record in event_favorites.
 *
 * **Validates: Requirements 4.1, 4.2**
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

import { toggleAttendance, toggleFavorite } from '@/lib/actions/events';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = vi.mocked(createClient);

/**
 * Creates a mock Supabase client that tracks which tables receive write operations.
 * This allows us to verify that toggleFavorite only writes to event_favorites
 * and toggleAttendance only writes to event_attendees.
 */
function buildTrackingMockClient(opts: {
  userId: string;
  eventId: string;
  isSystem: boolean;
  hasExistingAttendance: boolean;
  hasExistingFavorite: boolean;
}) {
  const { userId, isSystem, hasExistingAttendance, hasExistingFavorite } = opts;

  // Track all write operations (insert, upsert, delete) by table name
  const writeLog: { table: string; operation: string }[] = [];

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
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockResolvedValue({
          data: hasExistingAttendance ? { status: 'going' } : null,
          error: hasExistingAttendance ? null : { code: 'PGRST116' },
        });

        builder.delete = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_attendees', operation: 'delete' });
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        });

        builder.upsert = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_attendees', operation: 'upsert' });
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: 'going' },
                error: null,
              }),
            }),
          };
        });

        builder.insert = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_attendees', operation: 'insert' });
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: 'going' },
                error: null,
              }),
            }),
          };
        });

        return builder;
      }

      if (table === 'event_favorites') {
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockResolvedValue({
          data: hasExistingFavorite ? { event_id: opts.eventId } : null,
          error: hasExistingFavorite ? null : { code: 'PGRST116' },
        });

        builder.delete = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_favorites', operation: 'delete' });
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        });

        builder.insert = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_favorites', operation: 'insert' });
          return Promise.resolve({ error: null });
        });

        builder.upsert = vi.fn().mockImplementation(() => {
          writeLog.push({ table: 'event_favorites', operation: 'upsert' });
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { event_id: opts.eventId },
                error: null,
              }),
            }),
          };
        });

        return builder;
      }

      // Default fallback for any other table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    _writeLog: writeLog,
  };

  return mockClient;
}

// Arbitrary generators
const eventIdArb = fc.uuid();
const userIdArb = fc.uuid();
const isSystemArb = fc.boolean();
const hasExistingAttendanceArb = fc.boolean();
const hasExistingFavoriteArb = fc.boolean();

describe('Feature: system-event-rsvp-unification, Property 4: Favorites orthogonal to RSVP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggleFavorite does not write to event_attendees table', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        isSystemArb,
        hasExistingAttendanceArb,
        hasExistingFavoriteArb,
        async (eventId, userId, isSystem, hasExistingAttendance, hasExistingFavorite) => {
          const mockClient = buildTrackingMockClient({
            userId,
            eventId,
            isSystem,
            hasExistingAttendance,
            hasExistingFavorite,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          await toggleFavorite(eventId);

          // Verify no writes occurred to event_attendees
          const attendeeWrites = mockClient._writeLog.filter(
            (entry) => entry.table === 'event_attendees',
          );
          expect(attendeeWrites).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggleAttendance does not write to event_favorites table', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventIdArb,
        userIdArb,
        isSystemArb,
        hasExistingAttendanceArb,
        hasExistingFavoriteArb,
        async (eventId, userId, isSystem, hasExistingAttendance, hasExistingFavorite) => {
          const mockClient = buildTrackingMockClient({
            userId,
            eventId,
            isSystem,
            hasExistingAttendance,
            hasExistingFavorite,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          await toggleAttendance(eventId);

          // Verify no writes occurred to event_favorites
          const favoriteWrites = mockClient._writeLog.filter(
            (entry) => entry.table === 'event_favorites',
          );
          expect(favoriteWrites).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
