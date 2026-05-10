'use server';

import { updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canViewBlockedOwnedResource, getViewerContext } from '@/lib/server/viewer-context';
import { createNotification } from '@/lib/actions/notifications';
import {
  createGroupSchema,
  groupCommentSchema,
  updateGroupSchema,
  type CreateGroupInput,
  type GroupCommentInput,
  type UpdateGroupInput,
} from '@/lib/validations/groups';
import { prettyZodError } from '@/lib/validations/common';
import {
  parseAndValidateRichTextDoc,
  RichTextValidationError,
} from '@/lib/rich-text/validate';
import { extractPlainText } from '@/lib/rich-text/extract-plain';
import type { Json } from '@/types/database';

const MAX_DESCRIPTION_PLAIN_LENGTH = 4000;

/**
 * Normalises the optional rich-text description payload coming
 * from group create/update actions. Mirrors the helper in
 * `@/lib/actions/events.ts` (kept inline rather than exported to
 * avoid a circular import between the two action modules).
 *
 * Inputs:
 *   * `undefined` — caller didn't touch the description; leave both
 *     `description` and `description_json` untouched on the row;
 *   * `null` — caller explicitly wants to clear the rich body;
 *   * any other value — must round-trip through
 *     `parseAndValidateRichTextDoc` (server-side whitelist). On
 *     success we return both the validated JSON doc and a clamped
 *     plain-text projection so the trigger has a defensible mirror
 *     to write into `description`.
 */
function normalizeDescriptionRichText(
  raw: unknown,
): { kind: 'untouched' } | { kind: 'cleared' } | { kind: 'set'; doc: Json; plain: string } | { error: string } {
  if (raw === undefined) return { kind: 'untouched' };
  if (raw === null) return { kind: 'cleared' };
  try {
    const doc = parseAndValidateRichTextDoc(raw);
    const plain = extractPlainText(doc).slice(0, MAX_DESCRIPTION_PLAIN_LENGTH);
    return { kind: 'set', doc: doc as unknown as Json, plain };
  } catch (err) {
    if (err instanceof RichTextValidationError) return { error: err.message };
    return { error: 'Invalid description body' };
  }
}

function revalidateLandingGroups() {
  updateTag('landing:groups');
}

interface ManageableGroupRow {
  groups: {
    id: string;
    name: string;
    cover_url: string | null;
    country: string | null;
    city: string | null;
    city_id: string | null;
  } | null;
}

interface GroupInterestItem {
  id: string;
  slug: string;
  icon: string | null;
  translations: Record<string, string> | null;
  category_id: string;
}

export async function canEditGroup(groupId: string) {
  const supabase = await createClient();
  const viewer = await getViewerContext();
  if (!viewer.userId) return false;

  if (viewer.isAdmin) return true;

  const { data: group } = await supabase
    .from('groups')
    .select('created_by, is_blocked')
    .eq('id', groupId)
    .maybeSingle();

  if (!group) return false;
  if (group.created_by === viewer.userId) return true;
  if (group.is_blocked) return false;
  if (viewer.isModerator) return true;

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', viewer.userId)
    .single();

  return member?.role === 'admin' || member?.role === 'moderator';
}

export async function getGroupRaw(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  return data;
}

export async function updateGroup(groupId: string, data: UpdateGroupInput) {
  const parsed = updateGroupSchema.safeParse(data);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(groupId);
  if (!allowed) return { error: 'No permission to edit this group' };

  const richBody = normalizeDescriptionRichText(parsed.data.description_json);
  if ('error' in richBody) return richBody;

  const { interest_ids, description_json: _ignoredJson, ...groupData } = parsed.data;

  const updatePayload: Record<string, unknown> = { ...groupData };
  if (richBody.kind === 'set') {
    updatePayload.description = richBody.plain;
    updatePayload.description_json = richBody.doc;
  } else if (richBody.kind === 'cleared') {
    updatePayload.description_json = null;
  }

  const { error } = await supabase.from('groups').update(updatePayload).eq('id', groupId);
  if (error) return { error: error.message };

  if (interest_ids !== undefined) {
    await supabase.from('group_interests').delete().eq('group_id', groupId);
    if (interest_ids.length > 0) {
      await supabase.from('group_interests').insert(
        interest_ids.map((id) => ({ group_id: groupId, interest_id: id }))
      );
    }
  }

  revalidateLandingGroups();
  return { success: true };
}

export async function addGroupModerator(groupId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(groupId);
  if (!allowed) return { error: 'No permission' };

  const { data: existing } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.role === 'admin') return { error: 'Cannot change admin role' };
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'moderator' })
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'moderator' });
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function removeGroupModerator(groupId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(groupId);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('group_members')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getGroupInterests(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_interests')
    .select('interest_id')
    .eq('group_id', groupId);
  return (data || []).map((r) => r.interest_id);
}

export async function getGroupInterestsFull(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_interests')
    .select('interest_id, interests(id, slug, icon, translations, category_id)')
    .eq('group_id', groupId);
  const interests = (data || [])
    .map((row) => {
      const interest = Array.isArray(row.interests) ? row.interests[0] : row.interests;
      return interest ?? null;
    });
  return interests.filter(Boolean) as GroupInterestItem[];
}

export async function getUserManageableGroups() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('group_members')
    .select('group_id, role, groups(id, name, cover_url, country, city, city_id)')
    .eq('user_id', user.id)
    .in('role', ['admin', 'moderator']);

  const groups = (data || []).map((member) => {
    const group = Array.isArray(member.groups) ? member.groups[0] : member.groups;
    return group ?? null;
  });

  return groups.filter(Boolean) as NonNullable<ManageableGroupRow['groups']>[];
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('is_blocked', false)
    .is('deleted_at', null)
    .ilike('display_name', `%${query}%`)
    .limit(10);
  return data || [];
}

export async function createGroup(data: CreateGroupInput) {
  const parsed = createGroupSchema.safeParse(data);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const richBody = normalizeDescriptionRichText(parsed.data.description_json);
  if ('error' in richBody) return richBody;

  const { interest_ids, description_json: _ignoredJson, ...groupData } = parsed.data;

  const insertPayload: Record<string, unknown> = { ...groupData, created_by: user.id };
  if (richBody.kind === 'set') {
    insertPayload.description = richBody.plain;
    insertPayload.description_json = richBody.doc;
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  });

  if (interest_ids && interest_ids.length > 0) {
    await supabase.from('group_interests').insert(
      interest_ids.map((id) => ({ group_id: group.id, interest_id: id }))
    );
  }

  revalidateLandingGroups();
  return { success: true, group };
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([
    supabase
      .from('groups_with_counts')
      .select('*')
      .eq('id', groupId)
      .maybeSingle(),
    getViewerContext(),
  ]);

  if (!data) return null;
  if (!canViewBlockedOwnedResource(viewer, data.created_by, {
    isBlocked: data.is_blocked,
    ownerBlocked: data.creator_is_blocked,
  })) {
    return null;
  }

  return data;
}

export async function getGroupByCountrySlug(country: string, slug: string) {
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([
    supabase
      .from('groups_with_counts')
      .select('*')
      .eq('country', country.toUpperCase())
      .eq('slug', slug.toLowerCase())
      .maybeSingle(),
    getViewerContext(),
  ]);

  if (!data) return null;
  if (!canViewBlockedOwnedResource(viewer, data.created_by, {
    isBlocked: data.is_blocked,
    ownerBlocked: data.creator_is_blocked,
  })) {
    return null;
  }

  return data;
}

export async function isSlugAvailable(slug: string, country: string | null, excludeGroupId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('groups')
    .select('id')
    .eq('slug', slug.toLowerCase());

  if (country) {
    query = query.eq('country', country);
  } else {
    query = query.is('country', null);
  }

  if (excludeGroupId) {
    query = query.neq('id', excludeGroupId);
  }

  const { data } = await query.maybeSingle();
  return !data;
}

export async function getGroups(
  filters: {
    country?: string;
    city?: string;
    city_id?: string;
    interests?: string[];
    languages?: string[];
    /**
     * Free-text query, applied to `groups.search_tsv` (name +
     * description + city). Empty / undefined skips the filter.
     */
    q?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const supabase = await createClient();
  const limit = filters.limit || 12;
  const offset = filters.offset || 0;

  let query = supabase
    .from('groups_with_counts')
    .select('*')
    .eq('is_blocked', false)
    .eq('creator_is_blocked', false)
    .order('member_count', { ascending: false });

  if (filters.city_id) {
    query = query.eq('city_id', filters.city_id);
  } else if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  } else if (filters.country) {
    query = query.eq('country', filters.country);
  }

  if (filters.interests && filters.interests.length > 0) {
    const { data: matches } = await supabase
      .from('group_interests')
      .select('group_id')
      .in('interest_id', filters.interests);

    const groupIds = [...new Set((matches || []).map((row) => row.group_id))];
    if (groupIds.length === 0) return [];
    query = query.in('id', groupIds);
  }

  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages);
  }

  if (filters.q && filters.q.trim().length > 0) {
    query = query.textSearch('search_tsv', filters.q.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  }

  const { data } = await query.range(offset, offset + limit - 1);

  return data || [];
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_members')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('joined_at');
  return data || [];
}

export async function getGroupEvents(groupId: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    // Keep ongoing group events in the upcoming list until they end.
    .gte('ends_at', nowIso)
    .order('starts_at', { ascending: true });
  return data || [];
}

export async function getPastGroupEvents(groupId: string) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('group_id', groupId)
    .in('status', ['published', 'completed'])
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .lt('ends_at', nowIso)
    .order('starts_at', { ascending: false });
  return data || [];
}

export async function getGroupPhotos(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('id, title, photos')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .eq('is_blocked', false)
    .not('photos', 'is', null)
    .order('starts_at', { ascending: false });

  const photos: { url: string; eventId: string; eventTitle: string }[] = [];
  for (const event of data || []) {
    if (event.photos && Array.isArray(event.photos)) {
      for (const url of event.photos) {
        photos.push({ url, eventId: event.id, eventTitle: event.title });
      }
    }
  }
  return photos;
}

export async function getGroupComments(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_comments')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addGroupComment(
  groupId: string,
  content: string,
  parentId?: string,
  options?: { quotedText?: string; quotedAuthorName?: string; replyToId?: string },
) {
  const parsed = groupCommentSchema.safeParse({
    content,
    parentId,
    replyToId: options?.replyToId,
    quotedText: options?.quotedText,
    quotedAuthorName: options?.quotedAuthorName,
  } satisfies GroupCommentInput);
  if (!parsed.success) return { error: prettyZodError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: group } = await supabase
    .from('groups')
    .select('created_by, name')
    .eq('id', groupId)
    .single();

  const isReply = !!parentId;
  let autoApprove = true;

  if (isReply) {
    const isOwner = group?.created_by === user.id;

    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isGroupMod = member?.role === 'admin' || member?.role === 'moderator';

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSiteStaff = profile?.role === 'admin' || profile?.role === 'moderator';
    autoApprove = isOwner || isGroupMod || isSiteStaff;
  }

  const { data, error } = await supabase
    .from('group_comments')
    .insert({
      group_id: groupId,
      user_id: user.id,
      content: parsed.data.content,
      parent_id: parsed.data.parentId || null,
      is_approved: autoApprove,
      quoted_text: parsed.data.quotedText || null,
      quoted_author_name: parsed.data.quotedAuthorName || null,
      reply_to_id: parsed.data.replyToId || null,
    })
    .select('*, profiles(id, display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };

  const commenterName = data.profiles?.display_name || 'Someone';
  const snippet =
    parsed.data.content.length > 80 ? parsed.data.content.slice(0, 77) + '...' : parsed.data.content;
  const alreadyNotified = new Set<string>([user.id]);

  if (isReply && parentId) {
    const { data: parentComment } = await supabase
      .from('group_comments')
      .select('user_id')
      .eq('id', parentId)
      .single();

    if (parentComment && !alreadyNotified.has(parentComment.user_id)) {
      alreadyNotified.add(parentComment.user_id);
      void createNotification({
        userId: parentComment.user_id,
        type: 'comment_reply',
        title: `${commenterName} replied to your comment`,
        body: snippet,
        data: { groupId },
      });
    }

    if (options?.replyToId && options.replyToId !== parentId) {
      const { data: replyToComment } = await supabase
        .from('group_comments')
        .select('user_id')
        .eq('id', options.replyToId)
        .single();

      if (replyToComment && !alreadyNotified.has(replyToComment.user_id)) {
        alreadyNotified.add(replyToComment.user_id);
        void createNotification({
          userId: replyToComment.user_id,
          type: 'comment_reply',
          title: `${commenterName} replied to your comment`,
          body: snippet,
          data: { groupId },
        });
      }
    }
  }

  if (group?.created_by && !alreadyNotified.has(group.created_by)) {
    alreadyNotified.add(group.created_by);
    void createNotification({
      userId: group.created_by,
      type: 'new_comment',
      title: `${commenterName} commented in "${group.name}"`,
      body: snippet,
      data: { groupId },
    });
  }

  const { data: groupMods } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .in('role', ['admin', 'moderator']);

  for (const mod of groupMods || []) {
    if (!alreadyNotified.has(mod.user_id)) {
      alreadyNotified.add(mod.user_id);
      void createNotification({
        userId: mod.user_id,
        type: 'new_comment',
        title: `${commenterName} commented in "${group?.name || 'group'}"`,
        body: snippet,
        data: { groupId },
      });
    }
  }

  return { comment: data };
}

export async function approveGroupComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('group_comments')
    .update({ is_approved: true })
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteGroupComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('group_comments')
    .delete()
    .eq('id', commentId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleMembership(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.role === 'admin') return { error: 'Admins cannot leave their group' };
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    return { joined: false };
  }

  await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'member' });
  return { joined: true };
}

export async function toggleSubscription(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('group_subscriptions')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase.from('group_subscriptions').delete().eq('group_id', groupId).eq('user_id', user.id);
    return { subscribed: false };
  }

  await supabase.from('group_subscriptions').insert({ group_id: groupId, user_id: user.id });
  return { subscribed: true };
}

export async function getUserGroupStatus(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isMember: false, isSubscribed: false, role: null };

  const [{ data: member }, { data: sub }] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).single(),
    supabase.from('group_subscriptions').select('group_id').eq('group_id', groupId).eq('user_id', user.id).single(),
  ]);

  return {
    isMember: !!member,
    isSubscribed: !!sub,
    role: member?.role || null,
  };
}

export async function uploadGroupCover(formData: FormData, groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('cover') as File;
  if (!file) return { error: 'No file' };

  const fileExt = file.name.split('.').pop();
  const filePath = `${groupId}/cover.${fileExt}`;

  const { error } = await supabase.storage.from('group-covers').upload(filePath, file, { upsert: true });
  if (error) return { error: error.message };

  const { data: { publicUrl } } = supabase.storage.from('group-covers').getPublicUrl(filePath);

  await supabase.from('groups').update({ cover_url: publicUrl }).eq('id', groupId);
  return { url: publicUrl };
}
