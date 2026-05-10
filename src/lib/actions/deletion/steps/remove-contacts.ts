import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';

/** Shape of a user_contacts row needed for rollback */
interface ContactRecord {
  id: string;
  owner_id: string;
  contact_id: string;
  created_at: string;
}

/** Module-level storage for rollback data (scoped per execution) */
let deletedContacts: ContactRecord[] = [];

/**
 * Step: Remove contacts
 *
 * - Deletes all user_contacts where owner_id = user_id OR contact_id = user_id
 * - Stores deleted records for rollback
 * - Rolls back on failure by re-inserting deleted records
 *
 * Validates: Requirements 7.1, 7.3
 */
export const removeContacts: SoftDeleteStep = {
  name: 'removeContacts',

  async execute(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Reset rollback state
    deletedContacts = [];

    // 1. Query all contacts where user is owner or contact
    const { data: ownedContacts, error: ownedQueryError } = await supabase
      .from('user_contacts')
      .select('id, owner_id, contact_id, created_at')
      .eq('owner_id', ctx.userId);

    if (ownedQueryError) {
      throw new Error(
        `Failed to query owned contacts: ${ownedQueryError.message}`,
      );
    }

    const { data: incomingContacts, error: incomingQueryError } = await supabase
      .from('user_contacts')
      .select('id, owner_id, contact_id, created_at')
      .eq('contact_id', ctx.userId);

    if (incomingQueryError) {
      throw new Error(
        `Failed to query incoming contacts: ${incomingQueryError.message}`,
      );
    }

    // 2. Combine and deduplicate (a record could match both if owner_id = contact_id = userId)
    const allContacts = [...(ownedContacts ?? []), ...(incomingContacts ?? [])];
    const uniqueById = new Map<string, ContactRecord>();
    for (const record of allContacts) {
      uniqueById.set(record.id, record);
    }
    deletedContacts = Array.from(uniqueById.values());

    // Nothing to delete
    if (deletedContacts.length === 0) {
      return;
    }

    // 3. Delete contacts where owner_id = userId
    const { error: deleteOwnedError } = await supabase
      .from('user_contacts')
      .delete()
      .eq('owner_id', ctx.userId);

    if (deleteOwnedError) {
      throw new Error(
        `Failed to delete owned contacts: ${deleteOwnedError.message}`,
      );
    }

    // 4. Delete contacts where contact_id = userId
    const { error: deleteIncomingError } = await supabase
      .from('user_contacts')
      .delete()
      .eq('contact_id', ctx.userId);

    if (deleteIncomingError) {
      // Attempt to rollback the first delete before throwing
      const ownedRecords = deletedContacts.filter(
        (r) => r.owner_id === ctx.userId,
      );
      if (ownedRecords.length > 0) {
        await supabase.from('user_contacts').insert(ownedRecords);
      }
      throw new Error(
        `Failed to delete incoming contacts: ${deleteIncomingError.message}`,
      );
    }
  },

  async rollback(ctx: SoftDeleteContext, supabase: SupabaseClient): Promise<void> {
    // Re-insert all previously deleted contact records
    if (deletedContacts.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('user_contacts')
      .insert(deletedContacts);

    if (error) {
      console.error(
        `[removeContacts] Rollback failed: ${error.message}`,
      );
    }

    // Clear rollback state
    deletedContacts = [];
  },
};
