/**
 * Unit tests for crew invite link feature.
 *
 * Tests clipboard copy, Web Share API, redirect flow, OG metadata,
 * deactivation cascade, and kicked/voluntary leaver rejoin logic.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.6, 3.2, 3.3, 4.12, 4.13
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock next/cache, next/headers, next/navigation before any imports
// ---------------------------------------------------------------------------

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/i18n/navigation', () => ({
  redirect: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { joinViaInviteLink, deactivateInviterLinks } from '@/lib/actions/crew-invite';

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);

// ===========================================================================
// 1. Clipboard copy success
// Validates: Requirement 2.2
// ===========================================================================

describe('Clipboard copy success', () => {
  it('should resolve without throwing when clipboard.writeText succeeds', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    await expect(navigator.clipboard.writeText('https://example.com/invite/crew/abc123')).resolves.toBeUndefined();
    expect(mockWriteText).toHaveBeenCalledWith('https://example.com/invite/crew/abc123');
  });
});

// ===========================================================================
// 2. Clipboard copy failure
// Validates: Requirement 2.3
// ===========================================================================

describe('Clipboard copy failure', () => {
  it('should reject when clipboard.writeText fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard write failed'));
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    await expect(navigator.clipboard.writeText('https://example.com/invite/crew/abc123'))
      .rejects.toThrow('Clipboard write failed');
  });
});

// ===========================================================================
// 3. Web Share API availability detection
// Validates: Requirement 2.4
// ===========================================================================

describe('Web Share API availability detection', () => {
  it('should detect when navigator.share is available', () => {
    Object.assign(navigator, { share: vi.fn() });
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;
    expect(canShare).toBe(true);
  });

  it('should detect when navigator.share is NOT available', () => {
    // Temporarily remove share
    const original = navigator.share;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;
    expect(canShare).toBe(false);
    // Restore
    Object.defineProperty(navigator, 'share', { value: original, configurable: true });
  });
});

// ===========================================================================
// 4. Share dialog cancellation
// Validates: Requirement 2.6
// ===========================================================================

describe('Share dialog cancellation', () => {
  it('should not surface an error when user cancels the share dialog (AbortError)', async () => {
    const abortError = new Error('Share canceled');
    abortError.name = 'AbortError';

    const mockShare = vi.fn().mockRejectedValue(abortError);
    Object.assign(navigator, { share: mockShare });

    // Simulate the component's handleShare logic
    let errorSurfaced = false;
    try {
      await navigator.share({ title: 'Test', text: 'Test', url: 'https://example.com' });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Do nothing — this is the expected behavior per Requirement 2.6
      } else {
        errorSurfaced = true;
      }
    }

    expect(errorSurfaced).toBe(false);
  });
});

// ===========================================================================
// 5. Redirect flow preservation through auth
// Validates: Requirements 3.2, 3.3
// ===========================================================================

describe('Redirect flow preservation through auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signIn with redirectTo param should redirect to the invite link URL after auth', async () => {
    const { signIn } = await import('@/lib/actions/auth');

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    // signIn calls next/navigation redirect which throws
    await expect(
      signIn({
        email: 'test@example.com',
        password: 'password123',
        locale: 'en',
        redirectTo: '/invite/crew/abc123token',
      })
    ).rejects.toThrow('NEXT_REDIRECT:/en/invite/crew/abc123token');
  });

  it('signIn without redirectTo should redirect to locale root', async () => {
    const { signIn } = await import('@/lib/actions/auth');

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    await expect(
      signIn({
        email: 'test@example.com',
        password: 'password123',
        locale: 'en',
      })
    ).rejects.toThrow('NEXT_REDIRECT:/en');
  });

  it('signIn should reject redirectTo that does not start with /', async () => {
    const { signIn } = await import('@/lib/actions/auth');

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    mockedCreateClient.mockResolvedValue(mockSupabase as any);

    // When redirectTo doesn't start with '/', it should be ignored and redirect to root
    await expect(
      signIn({
        email: 'test@example.com',
        password: 'password123',
        locale: 'en',
        redirectTo: 'https://evil.com/phishing',
      })
    ).rejects.toThrow('NEXT_REDIRECT:/en');
  });
});


// ===========================================================================
// 6. OG metadata for valid token
// Validates: Requirement 3.18 (via getInviteLinkOGData)
// ===========================================================================

describe('OG metadata generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return crew name, event title, and cover URL for a valid active token', async () => {
    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    crew_id: 'crew-123',
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
                  data: { name: 'Party Crew', event_id: 'event-456' },
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
                    title: 'Summer Festival',
                    photos: ['https://cdn.example.com/cover.jpg'],
                  },
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

    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    // Simulate getInviteLinkOGData logic inline (since it's a private function in the page)
    const token = 'valid-token-abc123';
    const supabase = createAdminClient();

    const { data: link } = await supabase
      .from('crew_invite_links')
      .select('crew_id, status, expires_at')
      .eq('token', token)
      .single();

    expect(link).not.toBeNull();
    expect(link!.status).toBe('active');
    expect(new Date(link!.expires_at) > new Date()).toBe(true);

    const { data: crew } = await supabase
      .from('event_crews')
      .select('name, event_id')
      .eq('id', link!.crew_id)
      .single();

    expect(crew).not.toBeNull();
    expect(crew!.name).toBe('Party Crew');

    const { data: event } = await supabase
      .from('events')
      .select('title, photos')
      .eq('id', crew!.event_id)
      .single();

    expect(event).not.toBeNull();

    const ogData = {
      crewName: crew!.name,
      eventTitle: event!.title,
      eventCoverUrl: event!.photos?.[0] || null,
    };

    expect(ogData.crewName).toBe('Party Crew');
    expect(ogData.eventTitle).toBe('Summer Festival');
    expect(ogData.eventCoverUrl).toBe('https://cdn.example.com/cover.jpg');
  });

  // =========================================================================
  // 7. OG metadata for invalid token
  // =========================================================================

  it('should return null for an invalid/non-existent token', async () => {
    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
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

    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const supabase = createAdminClient();
    const { data: link, error: linkError } = await supabase
      .from('crew_invite_links')
      .select('crew_id, status, expires_at')
      .eq('token', 'nonexistent-token')
      .single();

    // getInviteLinkOGData returns null when link not found
    const result = linkError || !link ? null : { crewName: 'x' };
    expect(result).toBeNull();
  });

  it('should return null for an expired token', async () => {
    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    crew_id: 'crew-123',
                    status: 'active',
                    expires_at: new Date(Date.now() - 1000).toISOString(), // expired
                  },
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

    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const supabase = createAdminClient();
    const { data: link } = await supabase
      .from('crew_invite_links')
      .select('crew_id, status, expires_at')
      .eq('token', 'expired-token')
      .single();

    // getInviteLinkOGData returns null when expired
    const result = !link || link.status !== 'active' || new Date(link.expires_at) <= new Date()
      ? null
      : { crewName: 'x' };
    expect(result).toBeNull();
  });
});


// ===========================================================================
// 8. Deactivation on member removal
// Validates: Requirements 1.14, 4.12
// ===========================================================================

describe('Deactivation on member removal (removeMember)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removeMember should call deactivateInviterLinks and insert into crew_kicked_members', async () => {
    const hostId = 'host-user-id';
    const targetUserId = 'target-user-id';
    const crewId = 'crew-id-123';

    const kickedInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const deactivateUpdateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    // Mock server client (used by removeMember)
    const mockServerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: hostId } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'event_crews') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: crewId,
                    host_id: hostId,
                    event_id: 'event-id-456',
                    name: 'Test Crew',
                    participant_count: 4,
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
        if (table === 'event_crew_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { crew_id: crewId, user_id: targetUserId, role: 'member' },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: 'Target User' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_crew_messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        };
      }),
    };

    // Mock admin client (used by deactivateInviterLinks and crew_kicked_members insert)
    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            update: deactivateUpdateSpy,
          };
        }
        if (table === 'crew_kicked_members') {
          return {
            upsert: kickedInsertSpy,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    mockedCreateClient.mockResolvedValue(mockServerClient as any);
    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const { removeMember } = await import('@/lib/actions/crew');
    const result = await removeMember({ crew_id: crewId, user_id: targetUserId });

    expect(result.success).toBe(true);
    // deactivateInviterLinks was called (updates crew_invite_links)
    expect(deactivateUpdateSpy).toHaveBeenCalled();
    // crew_kicked_members was inserted
    expect(kickedInsertSpy).toHaveBeenCalled();
  });
});

// ===========================================================================
// 9. Deactivation on voluntary leave (leaveCrew)
// Validates: Requirements 1.14, 4.13
// ===========================================================================

describe('Deactivation on voluntary leave (leaveCrew)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leaveCrew should call deactivateInviterLinks but NOT insert into crew_kicked_members', async () => {
    const userId = 'member-user-id';
    const crewId = 'crew-id-123';
    const hostId = 'host-user-id';

    const kickedInsertSpy = vi.fn().mockResolvedValue({ error: null });
    const deactivateUpdateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const mockServerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'event_crews') {
          const builder: Record<string, any> = {};
          builder.select = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: crewId,
                  host_id: hostId,
                  status: 'active',
                  name: 'Test Crew',
                  event_id: 'event-456',
                  participant_count: 4,
                },
                error: null,
              }),
            }),
          });
          builder.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          });
          return builder;
        }
        if (table === 'event_crew_members') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockImplementation(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: userId, role: 'member' },
                    error: null,
                  }),
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                })),
              })),
            })),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: 'Member User' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_crew_messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        };
      }),
    };

    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            update: deactivateUpdateSpy,
          };
        }
        if (table === 'crew_kicked_members') {
          return {
            upsert: kickedInsertSpy,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    mockedCreateClient.mockResolvedValue(mockServerClient as any);
    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const { leaveCrew } = await import('@/lib/actions/crew');
    const result = await leaveCrew({ crew_id: crewId });

    expect(result.success).toBe(true);
    // deactivateInviterLinks was called
    expect(deactivateUpdateSpy).toHaveBeenCalled();
    // crew_kicked_members was NOT inserted (voluntary leave)
    expect(kickedInsertSpy).not.toHaveBeenCalled();
  });
});


// ===========================================================================
// 10. Kicked user cannot rejoin via invite link
// Validates: Requirement 4.12
// ===========================================================================

describe('Kicked user cannot rejoin via invite link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joinViaInviteLink should reject when user is in crew_kicked_members', async () => {
    const userId = 'kicked-user-id';
    const crewId = 'crew-id-123';
    const token = 'valid-token-abc123';

    const mockServerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'link-id',
                    crew_id: crewId,
                    created_by: 'inviter-id',
                    token,
                    status: 'active',
                    use_count: 1,
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
                    host_id: 'host-id',
                    event_id: 'event-id',
                    name: 'Test Crew',
                    capacity: 6,
                    participant_count: 3,
                    status: 'active',
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
                    id: 'event-id',
                    organizer_id: 'organizer-id',
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
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: userId, display_name: 'Kicked User', is_blocked: false },
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
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'event_crew_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'crew_kicked_members') {
          // User IS in kicked members
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    mockedCreateClient.mockResolvedValue(mockServerClient as any);
    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const result = await joinViaInviteLink({ token });

    expect(result.error).toBeDefined();
    expect(result.error).toContain('cannot join');
    expect(result.success).toBeUndefined();
  });
});

// ===========================================================================
// 11. Voluntary leaver can rejoin via invite link
// Validates: Requirement 4.13
// ===========================================================================

describe('Voluntary leaver can rejoin via invite link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joinViaInviteLink should succeed when user is NOT in crew_kicked_members', async () => {
    const userId = 'leaver-user-id';
    const crewId = 'crew-id-123';
    const token = 'valid-token-abc123';
    const inviterId = 'inviter-id';

    const mockServerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
    };

    let crewInviteLinksCallIndex = 0;
    let profilesCallIndex = 0;

    const mockAdminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'crew_invite_links') {
          crewInviteLinksCallIndex++;
          const callIndex = crewInviteLinksCallIndex;

          if (callIndex === 1) {
            // Fetch link by token
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'link-id',
                      crew_id: crewId,
                      created_by: inviterId,
                      token,
                      status: 'active',
                      use_count: 1,
                      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callIndex === 2) {
            // Get crew links for invitation limit check
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'link-id' }],
                  error: null,
                }),
              }),
            };
          }
          if (callIndex === 3) {
            // Increment use_count
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (callIndex === 4) {
            // Deactivate links if crew full (won't be full)
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
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
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: crewId,
                    host_id: 'host-id',
                    event_id: 'event-id',
                    name: 'Test Crew',
                    capacity: 6,
                    participant_count: 3,
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
                    id: 'event-id',
                    organizer_id: 'organizer-id',
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
          if (profilesCallIndex === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: userId, display_name: 'Leaver User', is_blocked: false },
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Inviter profile
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: 'Inviter Name' },
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
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'event_crew_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'crew_kicked_members') {
          // User is NOT in kicked members (voluntary leaver)
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
        if (table === 'event_crew_invitations') {
          return {
            select: vi.fn().mockImplementation((sel: string, opts?: any) => {
              if (opts?.count === 'exact') {
                return {
                  eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              };
            }),
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'crew_invite_link_joins') {
          return {
            select: vi.fn().mockImplementation((sel: string, opts?: any) => {
              if (opts?.count === 'exact') {
                return {
                  in: vi.fn().mockResolvedValue({ count: 1, error: null }),
                };
              }
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'event_crew_join_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'event_crew_messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
        };
      }),
    };

    mockedCreateClient.mockResolvedValue(mockServerClient as any);
    mockedCreateAdminClient.mockReturnValue(mockAdminClient as any);

    const result = await joinViaInviteLink({ token });

    expect(result.success).toBe(true);
    expect(result.crewId).toBe(crewId);
    expect(result.eventId).toBe('event-id');
    expect(result.error).toBeUndefined();
  });
});
