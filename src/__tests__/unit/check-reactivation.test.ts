import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { checkReactivation } from '@/lib/actions/deletion/check-reactivation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

function createMockSupabaseClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as any;
}

function createMockAdminClient(
  deletionRequest: { grace_period_ends_at: string } | null,
  error: { message: string } | null = null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: deletionRequest,
    error,
  });
  const eq3 = vi.fn().mockReturnValue({ maybeSingle });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const select = vi.fn().mockReturnValue({ eq: eq2 });

  return {
    from: vi.fn().mockReturnValue({ select }),
  } as any;
}

describe('checkReactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns needsReactivation: false when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient(null));

    const result = await checkReactivation();

    expect(result).toEqual({ needsReactivation: false });
  });

  it('returns needsReactivation: false when no pending deletion request exists', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ id: 'user-123' }));
    mockCreateAdminClient.mockReturnValue(createMockAdminClient(null));

    const result = await checkReactivation();

    expect(result).toEqual({ needsReactivation: false });
  });

  it('returns needsReactivation: true with expiresAt when grace period is active', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ id: 'user-123' }));
    mockCreateAdminClient.mockReturnValue(
      createMockAdminClient({ grace_period_ends_at: futureDate }),
    );

    const result = await checkReactivation();

    expect(result).toEqual({
      needsReactivation: true,
      expiresAt: futureDate,
    });
  });

  it('returns error "Account permanently deleted" when grace period has expired', async () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ id: 'user-123' }));
    mockCreateAdminClient.mockReturnValue(
      createMockAdminClient({ grace_period_ends_at: pastDate }),
    );

    const result = await checkReactivation();

    expect(result).toEqual({
      needsReactivation: false,
      error: 'Account permanently deleted',
    });
  });

  it('returns needsReactivation: false when database query fails', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ id: 'user-123' }));
    mockCreateAdminClient.mockReturnValue(
      createMockAdminClient(null, { message: 'Database connection error' }),
    );

    const result = await checkReactivation();

    expect(result).toEqual({ needsReactivation: false });
  });

  it('queries deletion_requests with correct user_id and status', async () => {
    const userId = 'user-abc-123';
    mockCreateClient.mockResolvedValue(createMockSupabaseClient({ id: userId }));
    const mockAdmin = createMockAdminClient(null);
    mockCreateAdminClient.mockReturnValue(mockAdmin);

    await checkReactivation();

    expect(mockAdmin.from).toHaveBeenCalledWith('deletion_requests');
    const selectCall = mockAdmin.from('deletion_requests').select;
    expect(selectCall).toHaveBeenCalledWith('grace_period_ends_at');
  });
});
