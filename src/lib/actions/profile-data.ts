'use server';

import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/server/viewer-context';

export async function getProfileFavoriteEvents(userId: string) {
  const supabase = await createClient();
  const { data: favs } = await supabase
    .from('event_favorites')
    .select('event_id')
    .eq('user_id', userId);
  if (!favs || favs.length === 0) return [];

  const ids = favs.map((f) => f.event_id);
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .in('id', ids)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('starts_at', { ascending: true });
  return data || [];
}

export async function getProfileGoingEvents(userId: string) {
  const supabase = await createClient();
  const { data: att } = await supabase
    .from('event_attendees')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'going');
  if (!att || att.length === 0) return [];

  const ids = att.map((a) => a.event_id);
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .in('id', ids)
    .gte('starts_at', new Date().toISOString())
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('starts_at', { ascending: true });
  return data || [];
}

export async function getProfilePastEvents(userId: string) {
  const supabase = await createClient();
  const { data: att } = await supabase
    .from('event_attendees')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'going');
  if (!att || att.length === 0) return [];

  const ids = att.map((a) => a.event_id);
  const { data } = await supabase
    .from('events_with_counts')
    .select('*')
    .in('id', ids)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false });
  return data || [];
}

export async function getProfileCreatedEvents(userId: string) {
  const supabase = await createClient();
  const viewer = await getViewerContext();
  const canSeeBlocked = viewer.isAdmin || viewer.userId === userId;

  let organizedQuery = supabase
    .from('events_with_counts')
    .select('*')
    .eq('organizer_id', userId)
    .order('starts_at', { ascending: false });

  if (!canSeeBlocked) {
    organizedQuery = organizedQuery
      .eq('is_blocked', false)
      .eq('organizer_is_blocked', false);
  }

  const { data: organized } = await organizedQuery;

  const { data: moderated } = await supabase
    .from('event_moderators')
    .select('event_id')
    .eq('user_id', userId);

  if (!moderated || moderated.length === 0) return organized || [];

  const modIds = moderated.map((m) => m.event_id);
  const orgIds = new Set((organized || []).map((e) => e.id));
  const extraIds = modIds.filter((id) => !orgIds.has(id));

  if (extraIds.length === 0) return organized || [];

  let extraQuery = supabase
    .from('events_with_counts')
    .select('*')
    .in('id', extraIds)
    .order('starts_at', { ascending: false });

  if (!canSeeBlocked) {
    extraQuery = extraQuery
      .eq('is_blocked', false)
      .eq('organizer_is_blocked', false);
  }

  const { data: extra } = await extraQuery;

  return [...(organized || []), ...(extra || [])];
}

export async function getProfileSubscribedGroups(userId: string) {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from('group_subscribers')
    .select('group_id')
    .eq('user_id', userId);
  if (!subs || subs.length === 0) return [];

  const ids = subs.map((s) => s.group_id);
  const { data } = await supabase
    .from('groups_with_counts')
    .select('*')
    .in('id', ids)
    .eq('is_blocked', false)
    .eq('creator_is_blocked', false)
    .order('member_count', { ascending: false });
  return data || [];
}

export async function getProfileManagedGroups(userId: string) {
  const supabase = await createClient();
  const viewer = await getViewerContext();
  const canSeeBlocked = viewer.isAdmin || viewer.userId === userId;

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', userId)
    .in('role', ['admin', 'moderator']);
  if (!memberships || memberships.length === 0) return [];

  const ids = memberships.map((m) => m.group_id);
  let query = supabase
    .from('groups_with_counts')
    .select('*')
    .in('id', ids)
    .order('member_count', { ascending: false });

  if (!canSeeBlocked) {
    query = query
      .eq('is_blocked', false)
      .eq('creator_is_blocked', false);
  }

  const { data } = await query;
  return data || [];
}
