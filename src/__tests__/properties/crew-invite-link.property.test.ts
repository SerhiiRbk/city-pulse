/**
 * Property-based tests for the crew-invite-link feature.
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

// Mock the Supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// Mock notifications module (imported by crew-invite.ts)
vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn(),
}));

import { generateInviteLink, revokeInviteLink, joinViaInviteLink, validateInviteToken } from '@/lib/actions/crew-invite';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  MAX_ACTIVE_INVITE_LINKS_PER_CREW,
  MAX_INVITE_LINK_GENERATIONS_PER_24H,
  MAX_INVITATIONS_PER_CREW,
} from '@/lib/constants/crew';

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);

// ---------------------------------------------------------------------------
// Types for precondition violations
// ---------------------------------------------------------------------------

type PreconditionViolation =
  | 'crew_full'
  | 'crew_archived'
  | 'max_active_links'
  | 'event_ended'
  | 'invitation_limit'
  | 'rate_limit';

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

const crewIdArb = fc.uuid();
const userIdArb = fc.uuid();
const eventIdArb = fc.uuid();

const violationArb: fc.Arbitrary<PreconditionViolation> = fc.oneof(
  fc.constant('crew_full' as const),
  fc.constant('crew_archived' as const),
  fc.constant('max_active_links' as const),
  fc.constant('event_ended' as const),
  fc.constant('invitation_limit' as const),
  fc.constant('rate_limit' as const),
);

// ---------------------------------------------------------------------------
// Mock builder for Property 3
// ---------------------------------------------------------------------------

/**
 * Builds a mock Supabase client that simulates a specific precondition violation
 * for generateInviteLink. The user is always authenticated and is the host of the crew.
 * The violation determines which check fails.
 */
function buildPreconditionViolationMock(opts: {
  userId: string;
  crewId: string;
  eventId: string;
  violation: PreconditionViolation;
}) {
  const { userId, crewId, eventId, violation } = opts;

  // Track whether insert was called
  const insertSpy = vi.fn();

  // Crew data varies based on violation
  const crewCapacity = 6;
  const crewParticipantCount = violation === 'crew_full' ? crewCapacity : 3;
  const crewStatus = violation === 'crew_archived' ? 'archived' : 'active';

  // Event timing: if event_ended, set starts_at in the past
  const now = new Date();
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const eventStartsAt = violation === 'event_ended' ? pastStart : futureStart;
  const eventDurationMinutes = 120;

  // Active links count
  const activeLinksCount =
    violation === 'max_active_links' ? MAX_ACTIVE_INVITE_LINKS_PER_CREW : 2;

  // Total invitations count (for invitation_limit violation)
  const standardInvitationCount =
    violation === 'invitation_limit' ? MAX_INVITATIONS_PER_CREW : 5;

  // Recent generations count (for rate_limit violation)
  const recentGenerationsCount =
    violation === 'rate_limit' ? MAX_INVITE_LINK_GENERATIONS_PER_24H : 3;

  // Track which crew_invite_links select call we're on to differentiate
  // between the active links count query, the crew links data query, and the rate limit query
  let crewInviteLinksCallIndex = 0;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'event_crews') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: crewId,
              host_id: userId, // user is the host
              event_id: eventId,
              name: 'Test Crew',
              capacity: crewCapacity,
              participant_count: crewParticipantCount,
              status: crewStatus,
            },
            error: null,
          }),
        };
      }

      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: eventId,
              starts_at: eventStartsAt,
              duration_minutes: eventDurationMinutes,
            },
            error: null,
          }),
        };
      }

      if (table === 'crew_invite_links') {
        crewInviteLinksCallIndex++;
        const callIndex = crewInviteLinksCallIndex;

        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.gte = vi.fn().mockReturnValue(builder);
        builder.in = vi.fn().mockReturnValue(builder);

        builder.insert = insertSpy.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Should not be called' },
            }),
          }),
        });

        if (callIndex === 1) {
          // First call: count active links (select with count: 'exact', head: true)
          // The actual implementation uses { count: 'exact', head: true }
          // which returns { count: number }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: activeLinksCount,
                  error: null,
                }),
              }),
            }),
          };
        }

        if (callIndex === 2) {
          // Second call: get crew links for invitation limit check (select id)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: violation === 'invitation_limit' ? [] : [],
                error: null,
              }),
            }),
          };
        }

        if (callIndex === 3) {
          // Third call: rate limit check (count recent generations)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  count: recentGenerationsCount,
                  error: null,
                }),
              }),
            }),
          };
        }

        // Fallback
        return builder;
      }

      if (table === 'event_crew_invitations') {
        // Count standard invitations
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: standardInvitationCount,
              error: null,
            }),
          }),
        };
      }

      if (table === 'crew_invite_link_joins') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'moderator' },
            error: null,
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

  return { mockClient, insertSpy };
}

// ---------------------------------------------------------------------------
// Property 3 test
// ---------------------------------------------------------------------------

/**
 * Feature: crew-invite-link, Property 3: Generation precondition enforcement
 *
 * For any crew violating at least one precondition (full, archived, 5 active links,
 * event ended, invitation limit, rate limit), generation SHALL return error and no
 * record created.
 *
 * **Validates: Requirements 1.5, 1.6, 1.7, 1.12, 5.10, 6.2, 6.4, 6.5**
 */
describe('Feature: crew-invite-link, Property 3: Generation precondition enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generation SHALL return error and no record created when any precondition is violated', async () => {
    await fc.assert(
      fc.asyncProperty(
        crewIdArb,
        userIdArb,
        eventIdArb,
        violationArb,
        async (crewId, userId, eventId, violation) => {
          const { mockClient, insertSpy } = buildPreconditionViolationMock({
            userId,
            crewId,
            eventId,
            violation,
          });

          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await generateInviteLink({ crew_id: crewId });

          // SHALL return an error
          expect(result.error).toBeDefined();
          expect(result.error).not.toBe('');
          expect(result.link).toBeUndefined();
          expect(result.url).toBeUndefined();

          // No insert SHALL be called (no record created)
          expect(insertSpy).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Revocation authorization
// ---------------------------------------------------------------------------

type RevocationRole = 'host' | 'moderator' | 'member' | 'non-participant';

/**
 * Builds a mock Supabase client for revokeInviteLink testing.
 *
 * Simulates the authorization flow:
 * - getUser returns the acting user
 * - crew_invite_links query returns the link record
 * - event_crews query returns the crew with host_id
 * - event_crew_members query returns the user's role (if not host)
 * - update on crew_invite_links succeeds (if authorized)
 */
function buildRevokeMockClient(opts: {
  actingUserId: string;
  linkId: string;
  linkCreatedBy: string;
  crewId: string;
  hostId: string;
  actingUserRole: RevocationRole;
}) {
  const { actingUserId, linkId, linkCreatedBy, crewId, hostId, actingUserRole } = opts;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: actingUserId } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.single = vi.fn().mockResolvedValue({
          data: {
            id: linkId,
            crew_id: crewId,
            created_by: linkCreatedBy,
            status: 'active',
          },
          error: null,
        });
        builder.update = vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }));
        return builder;
      }

      if (table === 'event_crews') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: crewId, host_id: hostId },
            error: null,
          }),
        };
      }

      if (table === 'event_crew_members') {
        if (actingUserRole === 'moderator') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'moderator' },
              error: null,
            }),
          };
        }
        if (actingUserRole === 'member') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          };
        }
        // non-participant: no membership found
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
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

/**
 * Feature: crew-invite-link, Property 5: Revocation authorization
 *
 * Host can revoke any link; Moderator can revoke only own links;
 * Member/non-participant gets permission error.
 *
 * **Validates: Requirements 5.3, 5.4, 5.8**
 */
describe('Feature: crew-invite-link, Property 5: Revocation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Host can revoke any link for their crew (regardless of who created it)', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb, // hostUserId (acting user)
        userIdArb, // linkCreatorId (someone else who created the link)
        crewIdArb, // linkId
        crewIdArb, // crewId
        async (hostUserId, linkCreatorId, linkId, crewId) => {
          const mockClient = buildRevokeMockClient({
            actingUserId: hostUserId,
            linkId,
            linkCreatedBy: linkCreatorId, // Link created by someone else
            crewId,
            hostId: hostUserId, // Acting user IS the host
            actingUserRole: 'host',
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await revokeInviteLink({ link_id: linkId });

          expect(result.error).toBeUndefined();
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Moderator can revoke only links where created_by equals their own user ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb, // moderatorUserId (acting user)
        userIdArb, // hostId
        crewIdArb, // linkId
        crewIdArb, // crewId
        async (moderatorUserId, hostId, linkId, crewId) => {
          // Moderator revoking their OWN link → should succeed
          const mockClientOwn = buildRevokeMockClient({
            actingUserId: moderatorUserId,
            linkId,
            linkCreatedBy: moderatorUserId, // Link created by the moderator themselves
            crewId,
            hostId, // Someone else is host
            actingUserRole: 'moderator',
          });
          mockedCreateClient.mockResolvedValue(mockClientOwn as any);

          const resultOwn = await revokeInviteLink({ link_id: linkId });

          expect(resultOwn.error).toBeUndefined();
          expect(resultOwn.success).toBe(true);

          // Moderator revoking SOMEONE ELSE's link → should fail
          vi.clearAllMocks();
          const otherCreatorId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
          const mockClientOther = buildRevokeMockClient({
            actingUserId: moderatorUserId,
            linkId,
            linkCreatedBy: otherCreatorId, // Link created by someone else
            crewId,
            hostId, // Someone else is host
            actingUserRole: 'moderator',
          });
          mockedCreateClient.mockResolvedValue(mockClientOther as any);

          const resultOther = await revokeInviteLink({ link_id: linkId });

          expect(resultOther.success).toBeUndefined();
          expect(resultOther.error).toBeDefined();
          expect(resultOther.error).toContain('only revoke their own');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Regular member or non-participant gets a permission error when attempting to revoke', async () => {
    const roleArb = fc.constantFrom<RevocationRole>('member', 'non-participant');

    await fc.assert(
      fc.asyncProperty(
        userIdArb, // actingUserId
        userIdArb, // hostId
        userIdArb, // linkCreatorId
        crewIdArb, // linkId
        crewIdArb, // crewId
        roleArb, // role
        async (actingUserId, hostId, linkCreatorId, linkId, crewId, role) => {
          const mockClient = buildRevokeMockClient({
            actingUserId,
            linkId,
            linkCreatedBy: linkCreatorId,
            crewId,
            hostId, // Someone else is host
            actingUserRole: role,
          });
          mockedCreateClient.mockResolvedValue(mockClient as any);

          const result = await revokeInviteLink({ link_id: linkId });

          expect(result.success).toBeUndefined();
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Only the host or moderators');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Re-validation at join time
// ---------------------------------------------------------------------------

type JoinTimeInvalidState = 'revoked' | 'deactivated' | 'expired_by_time';

/**
 * Builds mock Supabase server client (for auth) and admin client (for DB operations)
 * for joinViaInviteLink testing.
 *
 * The token was valid at page load but becomes invalid at join time due to one of:
 * 1. Token status is 'revoked'
 * 2. Token status is 'deactivated'
 * 3. Token status is 'active' but expires_at is in the past (expired by time)
 */
function buildJoinRevalidationMocks(opts: {
  userId: string;
  token: string;
  linkId: string;
  crewId: string;
  invalidState: JoinTimeInvalidState;
}) {
  const { userId, token, linkId, crewId, invalidState } = opts;

  // Track whether membership insert was called
  const memberInsertSpy = vi.fn();

  // Server client mock (only used for auth.getUser)
  const mockServerClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  // Determine link status and expires_at based on the invalid state
  let linkStatus: string;
  let expiresAt: string;

  switch (invalidState) {
    case 'revoked':
      linkStatus = 'revoked';
      // expires_at is still in the future (it was valid at page load)
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'deactivated':
      linkStatus = 'deactivated';
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'expired_by_time':
      linkStatus = 'active';
      // expires_at is in the past (token expired between page load and join)
      expiresAt = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
      break;
  }

  // Admin client mock (used for all DB operations in joinViaInviteLink)
  const mockAdminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: linkId,
                  crew_id: crewId,
                  created_by: 'inviter-user-id',
                  token,
                  status: linkStatus,
                  use_count: 2,
                  expires_at: expiresAt,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        return {
          insert: memberInsertSpy.mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      // Default fallback for any other table
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  return { mockServerClient, mockAdminClient, memberInsertSpy };
}

/**
 * Feature: crew-invite-link, Property 8: Re-validation at join time
 *
 * For any token valid at page load but invalid at join time (expired, revoked,
 * deactivated), joinViaInviteLink SHALL reject.
 *
 * **Validates: Requirements 4.10**
 */
describe('Feature: crew-invite-link, Property 8: Re-validation at join time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joinViaInviteLink SHALL reject when token becomes invalid between page load and join confirmation', async () => {
    const invalidStateArb: fc.Arbitrary<JoinTimeInvalidState> = fc.oneof(
      fc.constant('revoked' as const),
      fc.constant('deactivated' as const),
      fc.constant('expired_by_time' as const),
    );

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.base64String({ minLength: 32, maxLength: 48 }), // token
        crewIdArb, // linkId
        crewIdArb, // crewId
        invalidStateArb,
        async (userId, token, linkId, crewId, invalidState) => {
          const { mockServerClient, mockAdminClient, memberInsertSpy } =
            buildJoinRevalidationMocks({
              userId,
              token,
              linkId,
              crewId,
              invalidState,
            });

          mockedCreateClient.mockResolvedValue(mockServerClient as any);
          mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

          const result = await joinViaInviteLink({ token });

          // SHALL reject with an error
          expect(result.error).toBeDefined();
          expect(result.error).not.toBe('');
          expect(result.success).toBeUndefined();
          expect(result.crewId).toBeUndefined();
          expect(result.eventId).toBeUndefined();

          // No membership insert SHALL be performed
          expect(memberInsertSpy).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 6: Join via link adds member and inserts system message
// ---------------------------------------------------------------------------

/**
 * Builds mock Supabase clients for joinViaInviteLink testing.
 *
 * Simulates a valid join scenario where:
 * - User is authenticated (server client)
 * - Token is valid and active (admin client)
 * - Crew is active and has capacity
 * - Event has not ended
 * - User is not blocked, not in another crew, not organizer, not kicked
 * - Invitation limit not reached
 *
 * Returns spies for the key operations we want to verify:
 * - memberInsertSpy: tracks event_crew_members insert
 * - crewUpdateSpy: tracks event_crews update (participant_count increment)
 * - messageInsertSpy: tracks event_crew_messages insert (system message)
 */
function buildJoinViaMockClients(opts: {
  userId: string;
  userName: string;
  crewId: string;
  hostId: string;
  inviterId: string;
  inviterName: string;
  eventId: string;
  token: string;
  capacity: number;
  participantCount: number;
}) {
  const {
    userId,
    userName,
    crewId,
    hostId,
    inviterId,
    inviterName,
    eventId,
    token,
    capacity,
    participantCount,
  } = opts;

  // Spies for the operations we want to verify
  const memberInsertSpy = vi.fn().mockResolvedValue({ error: null });
  const crewUpdateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const messageInsertSpy = vi.fn().mockResolvedValue({ error: null });

  // Server client: only used for auth.getUser()
  const mockServerClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };

  // Track admin client calls to differentiate between different table operations
  let eventCrewMembersCallIndex = 0;
  let crewInviteLinksCallIndex = 0;
  let profilesCallIndex = 0;

  const mockAdminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        crewInviteLinksCallIndex++;
        const callIndex = crewInviteLinksCallIndex;

        if (callIndex === 1) {
          // First call: fetch link by token (step 2)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'link-id-123',
                    crew_id: crewId,
                    created_by: inviterId,
                    token,
                    status: 'active',
                    use_count: 2,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (callIndex === 2) {
          // Second call: get crew links for invitation limit check (step 11)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'link-id-123' }],
                error: null,
              }),
            }),
          };
        }

        if (callIndex === 3) {
          // Third call: increment use_count (step 14)
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (callIndex === 4) {
          // Fourth call: deactivate links if crew full (step 20) - won't be full in our test
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }

        // Fallback
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      if (table === 'event_crews') {
        // First call: fetch crew (step 3), second call: update participant_count (step 13)
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: crewId,
                host_id: hostId,
                event_id: eventId,
                name: 'Test Crew',
                capacity,
                participant_count: participantCount,
                status: 'active',
              },
              error: null,
            }),
          }),
        });
        builder.update = crewUpdateSpy;
        return builder;
      }

      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: eventId,
                  organizer_id: 'other-organizer-id',
                  is_system: false,
                  starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  duration_minutes: 120,
                  title: 'Test Event',
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
        profilesCallIndex++;
        const pCallIndex = profilesCallIndex;

        if (pCallIndex === 1) {
          // First call: fetch user profile (step 6)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: userId, display_name: userName, is_blocked: false },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (pCallIndex === 2) {
          // Second call: fetch inviter profile (step 18)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: inviterName },
                  error: null,
                }),
              }),
            }),
          };
        }

        // Fallback
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === 'blocked_users') {
        // No blocks (step 7)
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        eventCrewMembersCallIndex++;
        const ecmCallIndex = eventCrewMembersCallIndex;

        if (ecmCallIndex === 1) {
          // First call: check if user is already in a crew for this event (step 8)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }

        if (ecmCallIndex === 2) {
          // Second call: insert member (step 12)
          return {
            insert: memberInsertSpy,
          };
        }

        if (ecmCallIndex === 3) {
          // Third call: fetch existing members for notifications (step 19)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [{ user_id: hostId }],
                  error: null,
                }),
              }),
            }),
          };
        }

        // Fallback
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: memberInsertSpy,
        };
      }

      if (table === 'crew_kicked_members') {
        // User not kicked (step 10)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        };
      }

      if (table === 'event_crew_invitations') {
        // First call: count standard invitations (step 11)
        // Second call: cancel pending invitations (step 16)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          // For count query
          count: 3,
        };
      }

      if (table === 'crew_invite_link_joins') {
        // For invitation limit check (count joins) and audit insert (step 15)
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'event_crew_messages') {
        // System message insert (step 18)
        return {
          insert: messageInsertSpy,
        };
      }

      if (table === 'event_crew_join_requests') {
        // Cancel pending join requests (step 17)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      // Default fallback
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }),
  };

  return { mockServerClient, mockAdminClient, memberInsertSpy, crewUpdateSpy, messageInsertSpy };
}

// Arbitrary generators for Property 6
const displayNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const tokenArb = fc.string({ minLength: 32, maxLength: 48 }).map((s) =>
  s.replace(/[^A-Za-z0-9_-]/g, 'a'),
).filter((s) => s.length >= 32);
const capacityArb = fc.integer({ min: 3, max: 10 });

/**
 * Feature: crew-invite-link, Property 6: Join via link adds member and inserts system message
 *
 * For any valid link and eligible user, joining SHALL add member, increment count,
 * and insert system message with joiner and inviter names.
 *
 * **Validates: Requirements 4.1, 7.2**
 */
describe('Feature: crew-invite-link, Property 6: Join via link adds member and inserts system message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joining SHALL add member with role member, increment participant_count, and insert system message with joiner and inviter names', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb, // userId (joiner)
        displayNameArb, // userName (joiner display name)
        crewIdArb, // crewId
        userIdArb, // hostId
        userIdArb, // inviterId
        displayNameArb, // inviterName
        eventIdArb, // eventId
        tokenArb, // token
        capacityArb, // capacity
        async (userId, userName, crewId, hostId, inviterId, inviterName, eventId, token, capacity) => {
          // Ensure participantCount is less than capacity (crew not full)
          const participantCount = Math.max(1, capacity - 2);

          const { mockServerClient, mockAdminClient, memberInsertSpy, crewUpdateSpy, messageInsertSpy } =
            buildJoinViaMockClients({
              userId,
              userName,
              crewId,
              hostId,
              inviterId,
              inviterName,
              eventId,
              token,
              capacity,
              participantCount,
            });

          mockedCreateClient.mockResolvedValue(mockServerClient as any);
          mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

          const result = await joinViaInviteLink({ token });

          // Verify success
          expect(result.success).toBe(true);
          expect(result.crewId).toBe(crewId);
          expect(result.eventId).toBe(eventId);

          // 1. Verify event_crew_members insert was called with user's ID and role = 'member'
          expect(memberInsertSpy).toHaveBeenCalledWith({
            crew_id: crewId,
            user_id: userId,
            role: 'member',
          });

          // 2. Verify event_crews update was called to increment participant_count
          expect(crewUpdateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              participant_count: participantCount + 1,
            }),
          );

          // 3. Verify system message was inserted containing both joiner's name and inviter's name
          expect(messageInsertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              crew_id: crewId,
              is_system: true,
              content: expect.stringContaining(userName),
            }),
          );
          // Also verify inviter name is in the message
          const insertCall = messageInsertSpy.mock.calls[0][0];
          expect(insertCall.content).toContain(inviterName);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Join precondition enforcement
// ---------------------------------------------------------------------------

type JoinPreconditionViolation =
  | 'already_in_crew_for_event'
  | 'is_event_organizer'
  | 'was_kicked';

/**
 * Builds mock Supabase server client (for auth) and admin client (for DB operations)
 * for joinViaInviteLink testing of join precondition enforcement.
 *
 * The token is valid and the crew/event are in a good state, but the USER violates
 * one of three preconditions:
 * 1. User is already in another crew for the same event
 * 2. User is the event organizer (non-system event)
 * 3. User was previously kicked from this crew
 */
function buildJoinPreconditionViolationMocks(opts: {
  userId: string;
  token: string;
  linkId: string;
  crewId: string;
  eventId: string;
  hostId: string;
  violation: JoinPreconditionViolation;
}) {
  const { userId, token, linkId, crewId, eventId, hostId, violation } = opts;

  // Track whether membership insert was called
  const memberInsertSpy = vi.fn();

  // Server client mock (only used for auth.getUser)
  const mockServerClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  // Valid link (active, not expired)
  const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Event in the future (not ended)
  const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Determine organizer_id based on violation
  const organizerId = violation === 'is_event_organizer' ? userId : 'other-organizer-id';
  // For organizer violation, event must NOT be a system event
  const isSystemEvent = false;

  // Admin client mock (used for all DB operations in joinViaInviteLink)
  const mockAdminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: linkId,
                  crew_id: crewId,
                  created_by: hostId,
                  token,
                  status: 'active',
                  use_count: 2,
                  expires_at: futureExpiry,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      if (table === 'event_crews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: crewId,
                  host_id: hostId,
                  event_id: eventId,
                  name: 'Test Crew',
                  capacity: 6,
                  participant_count: 3, // Not full
                  status: 'active',
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: eventId,
                  organizer_id: organizerId,
                  is_system: isSystemEvent,
                  starts_at: futureStart,
                  duration_minutes: 120,
                  title: 'Test Event',
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: userId,
                  display_name: 'Test User',
                  is_blocked: false, // Not platform-blocked
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'blocked_users') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [], // No blocks between user and host
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        // This table is queried for:
        // 1. Checking if user is already in another crew for same event (step 8)
        // 2. Inserting new membership (step 12)
        // 3. Getting existing members for notifications (step 19)
        const builder: Record<string, any> = {};
        builder.select = vi.fn().mockReturnValue(builder);
        builder.eq = vi.fn().mockReturnValue(builder);
        builder.neq = vi.fn().mockResolvedValue({ data: [], error: null });

        // For the "already in crew for event" check
        if (violation === 'already_in_crew_for_event') {
          // Return that user IS already in a crew for this event
          builder.eq = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ crew_id: 'other-crew-id', 'event_crews': { event_id: eventId } }],
              error: null,
            }),
          });
        } else {
          // Return empty (user is NOT in any crew for this event)
          builder.eq = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          });
        }

        builder.insert = memberInsertSpy.mockResolvedValue({ error: null });

        return builder;
      }

      if (table === 'crew_kicked_members') {
        if (violation === 'was_kicked') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { crew_id: crewId, user_id: userId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // Not kicked
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        };
      }

      // Default fallback for any other table
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  return { mockServerClient, mockAdminClient, memberInsertSpy };
}

/**
 * Feature: crew-invite-link, Property 7: Join precondition enforcement
 *
 * For any user violating at least one precondition (already in crew for event,
 * is organizer, was kicked), join SHALL be rejected with no membership created.
 *
 * **Validates: Requirements 4.6, 4.8, 4.12, 6.11**
 */
describe('Feature: crew-invite-link, Property 7: Join precondition enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('join SHALL be rejected with no membership created when user violates a precondition', async () => {
    const joinViolationArb: fc.Arbitrary<JoinPreconditionViolation> = fc.oneof(
      fc.constant('already_in_crew_for_event' as const),
      fc.constant('is_event_organizer' as const),
      fc.constant('was_kicked' as const),
    );

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.base64String({ minLength: 32, maxLength: 48 }), // token
        crewIdArb, // linkId
        crewIdArb, // crewId
        eventIdArb, // eventId
        userIdArb, // hostId
        joinViolationArb,
        async (userId, token, linkId, crewId, eventId, hostId, violation) => {
          const { mockServerClient, mockAdminClient, memberInsertSpy } =
            buildJoinPreconditionViolationMocks({
              userId,
              token,
              linkId,
              crewId,
              eventId,
              hostId,
              violation,
            });

          mockedCreateClient.mockResolvedValue(mockServerClient as any);
          mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

          const result = await joinViaInviteLink({ token });

          // SHALL be rejected with an error
          expect(result.error).toBeDefined();
          expect(result.error).not.toBe('');
          expect(result.success).toBeUndefined();

          // No membership insert SHALL be performed
          expect(memberInsertSpy).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 10: Already-member redirect
// ---------------------------------------------------------------------------

/**
 * Builds mock Supabase admin client for validateInviteToken testing.
 *
 * Simulates a scenario where:
 * - Token is valid and active
 * - Crew exists and is active
 * - Event has not ended
 * - Crew is not full
 * - User is NOT platform-blocked
 * - User IS already a member of the target crew
 *
 * The function should return { status: 'already_member', crewId, eventId }
 */
function buildAlreadyMemberMock(opts: {
  userId: string;
  token: string;
  crewId: string;
  eventId: string;
  hostId: string;
}) {
  const { userId, token, crewId, eventId, hostId } = opts;

  const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const mockAdminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'link-id-abc',
                  crew_id: crewId,
                  created_by: hostId,
                  token,
                  status: 'active',
                  expires_at: futureExpiry,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'event_crews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: crewId,
                  name: 'Test Crew',
                  capacity: 6,
                  participant_count: 3,
                  event_id: eventId,
                  status: 'active',
                  host_id: hostId,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: eventId,
                  title: 'Test Event',
                  starts_at: futureStart,
                  duration_minutes: 120,
                  address: 'Test Address',
                  city: 'Test City',
                  photos: [],
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: userId, is_blocked: false },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'blocked_users') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'crew_kicked_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        // User IS already a member of this crew
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { crew_id: crewId },
                  error: null,
                }),
              }),
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

  return { mockAdminClient };
}

/**
 * Feature: crew-invite-link, Property 10: Already-member redirect
 *
 * For any authenticated user already in the target crew, opening the link
 * SHALL redirect to crew detail page without showing dialog.
 *
 * **Validates: Requirements 3.13, 3.14**
 */
describe('Feature: crew-invite-link, Property 10: Already-member redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validateInviteToken SHALL return already_member with crewId and eventId for any user already in the crew, and SHALL NOT return valid status', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb, // userId (already a member)
        tokenArb, // token
        crewIdArb, // crewId
        eventIdArb, // eventId
        userIdArb, // hostId
        async (userId, token, crewId, eventId, hostId) => {
          const { mockAdminClient } = buildAlreadyMemberMock({
            userId,
            token,
            crewId,
            eventId,
            hostId,
          });

          mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

          const result = await validateInviteToken(token, userId);

          // 1. The result status SHALL be 'already_member'
          expect(result.status).toBe('already_member');

          // 2. The result SHALL include crewId and eventId (needed for redirect URL)
          if (result.status === 'already_member') {
            expect(result.crewId).toBe(crewId);
            expect(result.eventId).toBe(eventId);
          }

          // 3. The result SHALL NOT have status 'valid' (no dialog should be shown)
          expect(result.status).not.toBe('valid');
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 9: Landing page data completeness
// ---------------------------------------------------------------------------

/**
 * Builds a mock admin client for validateInviteToken testing where the token
 * is valid and all data is returned. We generate random crew/event/inviter data
 * and verify that the returned result contains all required fields.
 */
function buildValidateTokenCompleteMock(opts: {
  token: string;
  crewId: string;
  crewName: string;
  capacity: number;
  participantCount: number;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventDurationMinutes: number;
  eventAddress: string | null;
  eventCity: string | null;
  eventPhotos: string[];
  inviterId: string;
  inviterDisplayName: string;
  inviterAvatarUrl: string | null;
  userId: string | undefined;
}) {
  const {
    token,
    crewId,
    crewName,
    capacity,
    participantCount,
    eventId,
    eventTitle,
    eventStartsAt,
    eventDurationMinutes,
    eventAddress,
    eventCity,
    eventPhotos,
    inviterId,
    inviterDisplayName,
    inviterAvatarUrl,
    userId,
  } = opts;

  // Track calls to differentiate between different queries on the same table
  let profilesCallIndex = 0;

  const mockAdminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'crew_invite_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'link-id-123',
                  crew_id: crewId,
                  created_by: inviterId,
                  token,
                  status: 'active',
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'event_crews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: crewId,
                  name: crewName,
                  capacity,
                  participant_count: participantCount,
                  event_id: eventId,
                  status: 'active',
                  host_id: inviterId,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: eventId,
                  title: eventTitle,
                  starts_at: eventStartsAt,
                  duration_minutes: eventDurationMinutes,
                  address: eventAddress,
                  city: eventCity,
                  photos: eventPhotos,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
        profilesCallIndex++;
        const pCallIndex = profilesCallIndex;

        if (userId && pCallIndex === 1) {
          // First call when userId provided: check if user is blocked
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { is_blocked: false },
                  error: null,
                }),
              }),
            }),
          };
        }

        // Inviter profile fetch (last profiles call)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: inviterId,
                  display_name: inviterDisplayName,
                  avatar_url: inviterAvatarUrl,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'blocked_users') {
        // No blocks
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === 'crew_kicked_members') {
        // Not kicked
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        };
      }

      if (table === 'event_crew_members') {
        // Not already a member
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
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

  return { mockAdminClient };
}

// Arbitrary generators for Property 9
const crewNameArb = fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0);
const eventTitleArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
const addressArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  fc.constant(null as string | null),
);
const cityArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  fc.constant(null as string | null),
);
const photosArb = fc.array(
  fc.webUrl().map((url) => url),
  { minLength: 0, maxLength: 5 },
);
const avatarUrlArb = fc.oneof(
  fc.webUrl().map((url) => url),
  fc.constant(null as string | null),
);

/**
 * Feature: crew-invite-link, Property 9: Landing page data completeness
 *
 * For any valid invite link, the dialog data SHALL include event date/time, venue,
 * crew name, participant count, capacity, available spots; OG metadata SHALL include
 * crew name, event name, event cover URL.
 *
 * **Validates: Requirements 3.8, 3.18**
 */
describe('Feature: crew-invite-link, Property 9: Landing page data completeness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validateInviteToken SHALL return all required dialog fields when token is valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        crewIdArb, // crewId
        crewNameArb, // crewName
        capacityArb, // capacity (3-10)
        eventIdArb, // eventId
        eventTitleArb, // eventTitle
        addressArb, // eventAddress
        cityArb, // eventCity
        photosArb, // eventPhotos
        userIdArb, // inviterId
        displayNameArb, // inviterDisplayName
        avatarUrlArb, // inviterAvatarUrl
        tokenArb, // token
        async (
          crewId,
          crewName,
          capacity,
          eventId,
          eventTitle,
          eventAddress,
          eventCity,
          eventPhotos,
          inviterId,
          inviterDisplayName,
          inviterAvatarUrl,
          token,
        ) => {
          // Ensure participantCount < capacity (crew not full)
          const participantCount = Math.max(1, capacity - 2);

          // Event starts in the future (not ended)
          const eventStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          const eventDurationMinutes = 120;

          // Use a userId to test the full validation path
          const userId = 'test-user-id-for-property-9';

          const { mockAdminClient } = buildValidateTokenCompleteMock({
            token,
            crewId,
            crewName,
            capacity,
            participantCount,
            eventId,
            eventTitle,
            eventStartsAt,
            eventDurationMinutes,
            eventAddress,
            eventCity,
            eventPhotos,
            inviterId,
            inviterDisplayName,
            inviterAvatarUrl,
            userId,
          });

          mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

          const result = await validateInviteToken(token, userId);

          // SHALL return 'valid' status
          expect(result.status).toBe('valid');

          if (result.status !== 'valid') return; // Type narrowing

          // -----------------------------------------------------------------
          // Dialog data completeness (Requirement 3.8)
          // -----------------------------------------------------------------

          // 1. crew.name SHALL be present
          expect(result.crew.name).toBe(crewName);

          // 2. crew.capacity SHALL be present
          expect(result.crew.capacity).toBe(capacity);

          // 3. crew.participant_count SHALL be present
          expect(result.crew.participant_count).toBe(participantCount);

          // Available spots can be derived: capacity - participant_count
          const availableSpots = result.crew.capacity - result.crew.participant_count;
          expect(availableSpots).toBeGreaterThan(0);

          // 4. event.starts_at SHALL be present (event date/time)
          expect(result.event.starts_at).toBe(eventStartsAt);

          // 5. event.duration_minutes SHALL be present
          expect(result.event.duration_minutes).toBe(eventDurationMinutes);

          // 6. event.address SHALL be present (venue)
          expect(result.event.address).toBe(eventAddress);

          // 7. inviter.display_name SHALL be present
          expect(result.inviter.display_name).toBe(inviterDisplayName);

          // -----------------------------------------------------------------
          // OG metadata data availability (Requirement 3.18)
          // The OG helper (getInviteLinkOGData) uses crew name, event title,
          // and event photos/cover. Verify these fields are present in the
          // valid response so OG tags can be constructed.
          // -----------------------------------------------------------------

          // OG: crew name available
          expect(result.crew.name).toBeDefined();
          expect(typeof result.crew.name).toBe('string');
          expect(result.crew.name.length).toBeGreaterThan(0);

          // OG: event title available
          expect(result.event.title).toBe(eventTitle);
          expect(typeof result.event.title).toBe('string');
          expect(result.event.title.length).toBeGreaterThan(0);

          // OG: event photos array available (cover URL is photos[0])
          expect(result.event.photos).toBeDefined();
          expect(Array.isArray(result.event.photos)).toBe(true);
          expect(result.event.photos).toEqual(eventPhotos);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 11: Share text completeness
// ---------------------------------------------------------------------------

/**
 * Feature: crew-invite-link, Property 11: Share text completeness
 *
 * For any crew name and event name, the share text SHALL contain crew name,
 * event name, and full invite link URL.
 *
 * **Validates: Requirements 2.5**
 */
describe('Feature: crew-invite-link, Property 11: Share text completeness', () => {
  it('share text SHALL contain crew name, event name, and full invite link URL for any inputs', async () => {
    // Import the English messages to get the share text template
    const enMessages = await import('@/messages/en.json');
    const shareTextTemplate: string = (enMessages.default as any).invite.share.shareText;

    // Simple interpolation function matching next-intl's {variable} syntax
    function interpolate(template: string, values: Record<string, string>): string {
      return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
    }

    await fc.assert(
      fc.property(
        // Generate non-empty crew names (may contain special characters, unicode, etc.)
        fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
        // Generate non-empty event names
        fc.string({ minLength: 1, maxLength: 120 }).filter((s) => s.trim().length > 0),
        // Generate valid invite link URLs
        fc.string({ minLength: 32, maxLength: 64 })
          .map((s) => s.replace(/[^A-Za-z0-9_-]/g, 'x'))
          .filter((s) => s.length >= 32)
          .map((token) => `https://citypulse.app/invite/crew/${token}`),
        (crewName, eventName, url) => {
          const shareText = interpolate(shareTextTemplate, { crewName, eventName, url });

          // The share text SHALL contain the crew name
          expect(shareText).toContain(crewName);

          // The share text SHALL contain the event name
          expect(shareText).toContain(eventName);

          // The share text SHALL contain the full invite link URL
          expect(shareText).toContain(url);
        },
      ),
      { numRuns: 100 },
    );
  });
});
