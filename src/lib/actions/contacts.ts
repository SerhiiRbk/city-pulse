'use server';

import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const addContactSchema = z.object({
  contact_id: z.string().uuid(),
});

const removeContactSchema = z.object({
  contact_id: z.string().uuid(),
});

const getContactsSchema = z.object({
  search: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface ContactWithProfile {
  contact_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface PoolUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// addContact
// ---------------------------------------------------------------------------

/**
 * Adds a user from the interaction pool to the current user's contact list.
 *
 * Validations:
 * 1. User is authenticated
 * 2. contact_id is not the same as the current user
 * 3. Target user exists in the current user's interaction pool:
 *    - Same crew membership (current or past)
 *    - Approved (active) chat conversation
 *    - Mutual "going" RSVP on the same event
 * 4. Insert into user_contacts (handle duplicate gracefully)
 *
 * Requirements: 10.1, 10.2
 */
export async function addContact(
  input: z.infer<typeof addContactSchema>,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = addContactSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid contact_id' };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const contactId = parsed.data.contact_id;

  // 2. Cannot add yourself
  if (contactId === user.id) {
    return { error: 'Cannot add yourself as a contact' };
  }

  // 3. Validate the target user is in the interaction pool
  const isInPool = await isInInteractionPool(supabase, user.id, contactId);
  if (!isInPool) {
    return { error: 'User is not in your interaction pool' };
  }

  // 4. Insert into user_contacts (handle duplicate gracefully)
  const { error: insertError } = await supabase.from('user_contacts').insert({
    owner_id: user.id,
    contact_id: contactId,
  });

  if (insertError) {
    // Handle unique constraint violation (duplicate)
    if (
      insertError.code === '23505' ||
      insertError.message?.includes('duplicate') ||
      insertError.message?.includes('unique')
    ) {
      return { success: true }; // Already a contact — treat as success
    }
    return { error: insertError.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// removeContact
// ---------------------------------------------------------------------------

/**
 * Removes a user from the current user's contact list.
 *
 * Validations:
 * 1. User is authenticated
 * 2. Delete from user_contacts where owner_id = current user and contact_id = target
 *
 * Requirements: 10.1
 */
export async function removeContact(
  input: z.infer<typeof removeContactSchema>,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = removeContactSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid contact_id' };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Delete from user_contacts
  const { error: deleteError } = await supabase
    .from('user_contacts')
    .delete()
    .eq('owner_id', user.id)
    .eq('contact_id', parsed.data.contact_id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// getContacts
// ---------------------------------------------------------------------------

/**
 * Returns the current user's contacts with profile information.
 *
 * Features:
 * 1. Joins with profiles to get display_name and avatar_url
 * 2. Optional search filter on display_name (case-insensitive)
 * 3. Ordered by display_name
 *
 * Requirements: 10.1
 */
export async function getContacts(
  input?: z.infer<typeof getContactsSchema>,
): Promise<{ contacts?: ContactWithProfile[]; error?: string }> {
  const parsed = getContactsSchema.safeParse(input ?? {});
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Query user_contacts joined with profiles
  let query = supabase
    .from('user_contacts')
    .select(
      'contact_id, created_at, profiles!contact_id(display_name, avatar_url)',
    )
    .eq('owner_id', user.id);

  // 3. Apply search filter if provided
  if (parsed.data.search && parsed.data.search.length > 0) {
    query = query.ilike('profiles.display_name', `%${parsed.data.search}%`);
  }

  const { data, error: queryError } = await query;

  if (queryError) {
    return { error: queryError.message };
  }

  // 4. Map results to ContactWithProfile and sort by display_name
  const contacts: ContactWithProfile[] = (data || [])
    .filter((row) => row.profiles !== null)
    .map((row) => {
      const profile = row.profiles as unknown as {
        display_name: string;
        avatar_url: string | null;
      };
      return {
        contact_id: row.contact_id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        created_at: row.created_at,
      };
    });

  // Sort by display_name alphabetically
  contacts.sort((a, b) => a.display_name.localeCompare(b.display_name));

  return { contacts };
}

// ---------------------------------------------------------------------------
// getInteractionPool
// ---------------------------------------------------------------------------

/**
 * Returns users from the current user's interaction pool — people they can
 * add as contacts or invite to crews.
 *
 * The interaction pool includes users who share at least one of:
 * - Membership in the same crew (current or past)
 * - An approved (active) chat conversation
 * - Mutual "going" RSVP on the same event
 *
 * Supports:
 * - Optional search filter on display_name (case-insensitive)
 * - Optional event_id filter (restricts co-attendees to a specific event)
 * - Pagination via LIMIT (default 50)
 *
 * Requirements: 10.2, 10.4, 10.5
 */
export async function getInteractionPool(input?: {
  search?: string;
  event_id?: string;
  limit?: number;
}): Promise<{ users: PoolUser[]; error?: string }> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { users: [], error: 'Not authenticated' };

  const currentUserId = user.id;
  const limit = input?.limit ?? 50;
  const search = input?.search?.trim() || '';
  const eventId = input?.event_id || '';

  // Collect user IDs from three sources, then merge and deduplicate.
  const poolUserIds = new Set<string>();

  // -------------------------------------------------------------------------
  // Source 1: Crew co-members (users sharing any crew with current user)
  // -------------------------------------------------------------------------
  const { data: myCrewMemberships } = await supabase
    .from('event_crew_members')
    .select('crew_id')
    .eq('user_id', currentUserId);

  if (myCrewMemberships && myCrewMemberships.length > 0) {
    const myCrewIds = myCrewMemberships.map((m) => m.crew_id);

    const { data: coMembers } = await supabase
      .from('event_crew_members')
      .select('user_id')
      .in('crew_id', myCrewIds)
      .neq('user_id', currentUserId);

    if (coMembers) {
      for (const m of coMembers) {
        poolUserIds.add(m.user_id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Source 2: Conversation partners (active conversations)
  // -------------------------------------------------------------------------
  const { data: conversations } = await supabase
    .from('conversations')
    .select('participant_1, participant_2')
    .eq('status', 'active')
    .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`);

  if (conversations) {
    for (const conv of conversations) {
      const partnerId =
        conv.participant_1 === currentUserId
          ? conv.participant_2
          : conv.participant_1;
      poolUserIds.add(partnerId);
    }
  }

  // -------------------------------------------------------------------------
  // Source 3: Co-attendees (mutual "going" RSVP on same event)
  // -------------------------------------------------------------------------
  let myAttendanceQuery = supabase
    .from('event_attendees')
    .select('event_id')
    .eq('user_id', currentUserId)
    .eq('status', 'going');

  if (eventId) {
    myAttendanceQuery = myAttendanceQuery.eq('event_id', eventId);
  }

  const { data: myAttendances } = await myAttendanceQuery;

  if (myAttendances && myAttendances.length > 0) {
    const myEventIds = myAttendances.map((a) => a.event_id);

    const { data: coAttendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .in('event_id', myEventIds)
      .eq('status', 'going')
      .neq('user_id', currentUserId);

    if (coAttendees) {
      for (const a of coAttendees) {
        poolUserIds.add(a.user_id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // If no pool users found, return empty
  // -------------------------------------------------------------------------
  if (poolUserIds.size === 0) {
    return { users: [] };
  }

  // -------------------------------------------------------------------------
  // Fetch profiles for pool users, applying filters
  // -------------------------------------------------------------------------
  let profileQuery = supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', Array.from(poolUserIds))
    .limit(limit);

  if (search) {
    profileQuery = profileQuery.ilike('display_name', `%${search}%`);
  }

  profileQuery = profileQuery.order('display_name', { ascending: true });

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    return { users: [], error: profileError.message };
  }

  const users: PoolUser[] = (profiles || []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
  }));

  return { users };
}

// ---------------------------------------------------------------------------
// Helper: isInInteractionPool
// ---------------------------------------------------------------------------

/**
 * Checks if a target user is in the current user's interaction pool.
 * A user is in the pool if they share at least one of:
 * - Membership in the same crew (current or past)
 * - An approved (active) chat conversation
 * - Mutual "going" RSVP on the same event
 */
async function isInInteractionPool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  // Check 1: Same crew membership
  const { data: currentUserCrews } = await supabase
    .from('event_crew_members')
    .select('crew_id')
    .eq('user_id', currentUserId);

  if (currentUserCrews && currentUserCrews.length > 0) {
    const crewIds = currentUserCrews.map((m) => m.crew_id);
    const { data: sharedCrewMembership } = await supabase
      .from('event_crew_members')
      .select('crew_id')
      .eq('user_id', targetUserId)
      .in('crew_id', crewIds)
      .limit(1);

    if (sharedCrewMembership && sharedCrewMembership.length > 0) {
      return true;
    }
  }

  // Check 2: Approved (active) chat conversation
  const { data: conversationMatch } = await supabase
    .from('conversations')
    .select('id')
    .eq('status', 'active')
    .or(
      `and(participant_1.eq.${currentUserId},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${currentUserId})`,
    )
    .limit(1);

  if (conversationMatch && conversationMatch.length > 0) {
    return true;
  }

  // Check 3: Mutual "going" RSVP on the same event
  const { data: currentUserEvents } = await supabase
    .from('event_attendees')
    .select('event_id')
    .eq('user_id', currentUserId)
    .eq('status', 'going');

  if (currentUserEvents && currentUserEvents.length > 0) {
    const eventIds = currentUserEvents.map((a) => a.event_id);
    const { data: mutualRsvp } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', targetUserId)
      .eq('status', 'going')
      .in('event_id', eventIds)
      .limit(1);

    if (mutualRsvp && mutualRsvp.length > 0) {
      return true;
    }
  }

  return false;
}
