import { describe, it, expect, vi, beforeEach } from 'vitest';
import { closeConversations } from '@/lib/actions/deletion/steps/close-conversations';
import type { SoftDeleteContext } from '@/lib/actions/deletion/soft-delete-orchestrator';

function createMockContext(overrides?: Partial<SoftDeleteContext>): SoftDeleteContext {
  return {
    userId: 'user-123',
    userEmail: 'test@example.com',
    userLocale: 'en',
    displayName: 'Test User',
    requestedAt: new Date(),
    ...overrides,
  };
}

function createMockSupabase(options: {
  activeConversations?: { id: string; status: string }[];
  pendingConversations?: { id: string; status: string }[];
  activeError?: { message: string } | null;
  pendingError?: { message: string } | null;
  updateActiveError?: { message: string } | null;
  updatePendingError?: { message: string } | null;
}) {
  const {
    activeConversations = [],
    pendingConversations = [],
    activeError = null,
    pendingError = null,
    updateActiveError = null,
    updatePendingError = null,
  } = options;

  const updateFn = vi.fn();
  const inFn = vi.fn();
  const eqFn = vi.fn();

  // Track call sequence to differentiate between active and pending queries
  let selectCallCount = 0;
  let updateCallCount = 0;

  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        eq: vi.fn().mockImplementation(() => ({
          or: vi.fn().mockImplementation(() => {
            if (currentCall === 1) {
              return { data: activeConversations, error: activeError };
            }
            return { data: pendingConversations, error: pendingError };
          }),
        })),
      };
    }),
    update: vi.fn().mockImplementation(() => {
      updateCallCount++;
      const currentUpdate = updateCallCount;
      return {
        in: vi.fn().mockImplementation(() => {
          if (currentUpdate === 1) {
            return { error: updateActiveError };
          }
          return { error: updatePendingError };
        }),
        eq: vi.fn().mockImplementation(() => ({ error: null })),
      };
    }),
  }));

  return { from: mockFrom } as any;
}

describe('closeConversations', () => {
  it('has the correct step name', () => {
    expect(closeConversations.name).toBe('closeConversations');
  });

  describe('execute', () => {
    it('closes active conversations and declines pending ones', async () => {
      const ctx = createMockContext();
      const supabase = createMockSupabase({
        activeConversations: [
          { id: 'conv-1', status: 'active' },
          { id: 'conv-2', status: 'active' },
        ],
        pendingConversations: [
          { id: 'conv-3', status: 'pending' },
        ],
      });

      await expect(closeConversations.execute(ctx, supabase)).resolves.toBeUndefined();

      // Verify from('conversations') was called
      expect(supabase.from).toHaveBeenCalledWith('conversations');
    });

    it('handles no conversations gracefully', async () => {
      const ctx = createMockContext();
      const supabase = createMockSupabase({
        activeConversations: [],
        pendingConversations: [],
      });

      await expect(closeConversations.execute(ctx, supabase)).resolves.toBeUndefined();
    });

    it('throws on active conversation query error', async () => {
      const ctx = createMockContext();
      const supabase = createMockSupabase({
        activeError: { message: 'DB connection failed' },
      });

      await expect(closeConversations.execute(ctx, supabase)).rejects.toThrow(
        'Failed to query active conversations: DB connection failed',
      );
    });

    it('throws on pending conversation query error', async () => {
      const ctx = createMockContext();
      const supabase = createMockSupabase({
        activeConversations: [],
        pendingError: { message: 'Timeout' },
      });

      await expect(closeConversations.execute(ctx, supabase)).rejects.toThrow(
        'Failed to query pending conversations: Timeout',
      );
    });

    it('throws on update active conversations error', async () => {
      const ctx = createMockContext();
      const supabase = createMockSupabase({
        activeConversations: [{ id: 'conv-1', status: 'active' }],
        pendingConversations: [],
        updateActiveError: { message: 'Update failed' },
      });

      await expect(closeConversations.execute(ctx, supabase)).rejects.toThrow(
        'Failed to close active conversations: Update failed',
      );
    });

    it('throws on update pending conversations error', async () => {
      const ctx = createMockContext();
      // When active is non-empty, the first update is for active, second for pending
      const supabase = createMockSupabase({
        activeConversations: [{ id: 'conv-1', status: 'active' }],
        pendingConversations: [{ id: 'conv-3', status: 'pending' }],
        updatePendingError: { message: 'Update failed' },
      });

      await expect(closeConversations.execute(ctx, supabase)).rejects.toThrow(
        'Failed to decline pending conversations: Update failed',
      );
    });
  });

  describe('rollback', () => {
    it('restores original statuses after execute', async () => {
      const ctx = createMockContext();

      // First execute to populate rollback state
      let selectCallCount = 0;
      const executeSupabase = {
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            const currentCall = selectCallCount;
            return {
              eq: vi.fn().mockImplementation(() => ({
                or: vi.fn().mockImplementation(() => {
                  if (currentCall === 1) {
                    return {
                      data: [{ id: 'conv-1', status: 'active' }],
                      error: null,
                    };
                  }
                  return {
                    data: [{ id: 'conv-2', status: 'pending' }],
                    error: null,
                  };
                }),
              })),
            };
          }),
          update: vi.fn().mockImplementation(() => ({
            in: vi.fn().mockImplementation(() => ({ error: null })),
            eq: vi.fn().mockImplementation(() => ({ error: null })),
          })),
        })),
      } as any;

      await closeConversations.execute(ctx, executeSupabase);

      // Now rollback
      const rollbackSupabase = {
        from: vi.fn().mockImplementation(() => ({
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({ error: null })),
          })),
        })),
      } as any;

      await closeConversations.rollback!(ctx, rollbackSupabase);

      // Should have called from('conversations') for each snapshot
      expect(rollbackSupabase.from).toHaveBeenCalledWith('conversations');
      expect(rollbackSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no rollback state exists', async () => {
      const ctx = createMockContext({ userId: 'no-state-user' });
      const supabase = {
        from: vi.fn(),
      } as any;

      await closeConversations.rollback!(ctx, supabase);

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
