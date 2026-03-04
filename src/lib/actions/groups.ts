'use server';

import { createClient } from '@/lib/supabase/server';

export async function canEditGroup(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin' || profile?.role === 'moderator') return true;

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
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

export async function updateGroup(
  groupId: string,
  data: {
    name?: string;
    description?: string;
    cover_url?: string | null;
    country?: string | null;
    city?: string | null;
    interest_ids?: string[];
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(groupId);
  if (!allowed) return { error: 'No permission to edit this group' };

  const { interest_ids, ...groupData } = data;

  const { error } = await supabase.from('groups').update(groupData).eq('id', groupId);
  if (error) return { error: error.message };

  if (interest_ids !== undefined) {
    await supabase.from('group_interests').delete().eq('group_id', groupId);
    if (interest_ids.length > 0) {
      await supabase.from('group_interests').insert(
        interest_ids.map((id) => ({ group_id: groupId, interest_id: id }))
      );
    }
  }

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
  return (data || []).map((r: any) => r.interests).filter(Boolean);
}

export async function getUserManageableGroups() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('group_members')
    .select('group_id, role, groups(id, name, cover_url)')
    .eq('user_id', user.id)
    .in('role', ['admin', 'moderator']);

  return (data || [])
    .map((m: any) => m.groups)
    .filter(Boolean);
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${query}%`)
    .limit(10);
  return data || [];
}

export async function createGroup(data: {
  name: string;
  description: string;
  cover_url?: string;
  country?: string | null;
  city?: string | null;
  interest_ids?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { interest_ids, ...groupData } = data;

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ ...groupData, created_by: user.id })
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

  return { success: true, group };
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('groups_with_counts')
    .select('*')
    .eq('id', groupId)
    .single();
  return data;
}

export async function getGroups(filters: { limit?: number; offset?: number } = {}) {
  const supabase = await createClient();
  const limit = filters.limit || 12;
  const offset = filters.offset || 0;

  const { data } = await supabase
    .from('groups_with_counts')
    .select('*')
    .order('member_count', { ascending: false })
    .range(offset, offset + limit - 1);

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
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  return data || [];
}

export async function getPastGroupEvents(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .lt('starts_at', new Date().toISOString())
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
    .is('parent_id', null)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addGroupComment(groupId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('group_comments')
    .insert({ group_id: groupId, user_id: user.id, content })
    .select('*, profiles(id, display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };
  return { comment: data };
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
