import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// We test the orchestrator logic by mocking the step modules
vi.mock('@/lib/actions/deletion/steps/transfer-event-organizers', () => ({
  transferEventOrganizers: {
    name: 'transferEventOrganizers',
    execute: vi.fn(),
    rollback: vi.fn(),
  },
}));
vi.mock('@/lib/actions/deletion/steps/resolve-crews', () => ({
  resolveCrews: { name: 'resolveCrews', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/resolve-groups', () => ({
  resolveGroups: { name: 'resolveGroups', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/cancel-future-rsvps', () => ({
  cancelFutureRsvps: { name: 'cancelFutureRsvps', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/close-conversations', () => ({
  closeConversations: { name: 'closeConversations', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/remove-contacts', () => ({
  removeContacts: { name: 'removeContacts', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/cancel-crew-invitations', () => ({
  cancelCrewInvitations: { name: 'cancelCrewInvitations', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/remove-event-moderators', () => ({
  removeEventModerators: { name: 'removeEventModerators', execute: vi.fn(), rollback: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/delete-auth-record', () => ({
  deleteAuthRecord: { name: 'deleteAuthRecord', execute: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/create-deletion-request', () => ({
  createDeletionRequest: { name: 'createDeletionRequest', execute: vi.fn() },
}));
vi.mock('@/lib/actions/deletion/steps/send-confirmation-email', () => ({
  sendConfirmationEmail: { name: 'sendConfirmationEmail', execute: vi.fn() },
}));

import { executeSoftDelete, type SoftDeleteContext } from '@/lib/actions/deletion/soft-delete-orchestrator';
import { transferEventOrganizers } from '@/lib/actions/deletion/steps/transfer-event-organizers';
import { resolveCrews } from '@/lib/actions/deletion/steps/resolve-crews';
import { resolveGroups } from '@/lib/actions/deletion/steps/resolve-groups';
import { cancelFutureRsvps } from '@/lib/actions/deletion/steps/cancel-future-rsvps';
import { closeConversations } from '@/lib/actions/deletion/steps/close-conversations';
import { removeContacts } from '@/lib/actions/deletion/steps/remove-contacts';
import { cancelCrewInvitations } from '@/lib/actions/deletion/steps/cancel-crew-invitations';
import { removeEventModerators } from '@/lib/actions/deletion/steps/remove-event-moderators';
import { deleteAuthRecord } from '@/lib/actions/deletion/steps/delete-auth-record';
import { createDeletionRequest } from '@/lib/actions/deletion/steps/create-deletion-request';
import { sendConfirmationEmail } from '@/lib/actions/deletion/steps/send-confirmation-email';

const mockSupabase = {} as SupabaseClient;

function createContext(): SoftDeleteContext {
  return {
    userId: 'user-123',
    userEmail: 'test@example.com',
    userLocale: 'en',
    displayName: 'Test User',
    requestedAt: new Date('2025-01-01T00:00:00Z'),
  };
}

describe('executeSoftDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes all steps in order and returns success', async () => {
    const ctx = createContext();
    const callOrder: string[] = [];

    (transferEventOrganizers.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('transferEventOrganizers');
    });
    (resolveCrews.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('resolveCrews');
    });
    (resolveGroups.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('resolveGroups');
    });
    (cancelFutureRsvps.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('cancelFutureRsvps');
    });
    (closeConversations.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('closeConversations');
    });
    (removeContacts.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('removeContacts');
    });
    (cancelCrewInvitations.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('cancelCrewInvitations');
    });
    (removeEventModerators.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('removeEventModerators');
    });
    (deleteAuthRecord.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('deleteAuthRecord');
    });
    (createDeletionRequest.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('createDeletionRequest');
    });
    (sendConfirmationEmail.execute as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('sendConfirmationEmail');
    });

    const result = await executeSoftDelete(ctx, mockSupabase);

    expect(result).toEqual({ success: true });
    expect(callOrder).toEqual([
      'transferEventOrganizers',
      'resolveCrews',
      'resolveGroups',
      'cancelFutureRsvps',
      'closeConversations',
      'removeContacts',
      'cancelCrewInvitations',
      'removeEventModerators',
      'deleteAuthRecord',
      'createDeletionRequest',
      'sendConfirmationEmail',
    ]);
  });

  it('rolls back completed steps in reverse order on critical step failure', async () => {
    const ctx = createContext();
    const rollbackOrder: string[] = [];

    // First 3 steps succeed
    (transferEventOrganizers.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveCrews.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveGroups.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // 4th step fails
    (cancelFutureRsvps.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('RSVP cancellation failed'),
    );

    // Track rollback calls
    (resolveGroups.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('resolveGroups');
    });
    (resolveCrews.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('resolveCrews');
    });
    (transferEventOrganizers.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('transferEventOrganizers');
    });

    const result = await executeSoftDelete(ctx, mockSupabase);

    expect(result).toEqual({
      success: false,
      failedStep: 'cancelFutureRsvps',
      error: 'RSVP cancellation failed',
    });

    // Rollback should be in reverse order of completion
    expect(rollbackOrder).toEqual([
      'resolveGroups',
      'resolveCrews',
      'transferEventOrganizers',
    ]);
  });

  it('does NOT roll back on sendConfirmationEmail failure (non-critical)', async () => {
    const ctx = createContext();

    // All steps succeed except sendConfirmationEmail
    (transferEventOrganizers.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveCrews.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveGroups.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (cancelFutureRsvps.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (closeConversations.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (removeContacts.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (cancelCrewInvitations.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (removeEventModerators.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteAuthRecord.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createDeletionRequest.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (sendConfirmationEmail.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Email service unavailable'),
    );

    const result = await executeSoftDelete(ctx, mockSupabase);

    // Should still succeed despite email failure
    expect(result).toEqual({ success: true });

    // No rollback should have been called
    expect(transferEventOrganizers.rollback).not.toHaveBeenCalled();
    expect(resolveCrews.rollback).not.toHaveBeenCalled();
    expect(resolveGroups.rollback).not.toHaveBeenCalled();
    expect(cancelFutureRsvps.rollback).not.toHaveBeenCalled();
    expect(closeConversations.rollback).not.toHaveBeenCalled();
    expect(removeContacts.rollback).not.toHaveBeenCalled();
  });

  it('continues rollback even if a rollback step itself fails', async () => {
    const ctx = createContext();
    const rollbackOrder: string[] = [];

    // First 3 steps succeed
    (transferEventOrganizers.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveCrews.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveGroups.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // 4th step fails
    (cancelFutureRsvps.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Step failed'),
    );

    // resolveGroups rollback fails
    (resolveGroups.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('resolveGroups');
      throw new Error('Rollback failed');
    });
    (resolveCrews.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('resolveCrews');
    });
    (transferEventOrganizers.rollback as ReturnType<typeof vi.fn>).mockImplementation(() => {
      rollbackOrder.push('transferEventOrganizers');
    });

    const result = await executeSoftDelete(ctx, mockSupabase);

    expect(result.success).toBe(false);
    // All rollbacks should still be attempted even if one fails
    expect(rollbackOrder).toEqual([
      'resolveGroups',
      'resolveCrews',
      'transferEventOrganizers',
    ]);
  });

  it('skips rollback for steps without a rollback function', async () => {
    const ctx = createContext();

    // All steps up to createDeletionRequest succeed
    (transferEventOrganizers.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveCrews.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (resolveGroups.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (cancelFutureRsvps.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (closeConversations.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (removeContacts.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (cancelCrewInvitations.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (removeEventModerators.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteAuthRecord.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // createDeletionRequest fails (no rollback defined for it)
    (createDeletionRequest.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Insert failed'),
    );

    const result = await executeSoftDelete(ctx, mockSupabase);

    expect(result).toEqual({
      success: false,
      failedStep: 'createDeletionRequest',
      error: 'Insert failed',
    });

    // deleteAuthRecord has no rollback, so it should not be called
    // Other steps with rollback should be called
    expect(removeEventModerators.rollback).toHaveBeenCalled();
    expect(cancelCrewInvitations.rollback).toHaveBeenCalled();
    expect(removeContacts.rollback).toHaveBeenCalled();
  });
});
