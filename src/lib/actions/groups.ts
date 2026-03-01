'use server';

import { createClient } from '@/lib/supabase/server';

export async function createGroup(data: {
  name: string;
  description: string;
  cover_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ ...data, created_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  });

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
    .order('starts_at', { ascending: true });
  return data || [];
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
