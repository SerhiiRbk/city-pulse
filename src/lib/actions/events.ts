'use server';

import { createClient } from '@/lib/supabase/server';
import { nanoid } from '@/lib/utils';
import { canViewBlockedOwnedResource, getViewerContext } from '@/lib/server/viewer-context';

export async function createEvent(data: {
  title: string;
  description: string;
  languages?: string[];
  category_id: string;
  starts_at: string;
  duration_minutes: number;
  is_online: boolean;
  is_free: boolean;
  price?: number;
  currency?: string;
  max_attendees?: number;
  country?: string;
  city?: string;
  city_id?: string | null;
  address?: string;
  lat?: number;
  lng?: number;
  is_private: boolean;
  photos?: string[];
  group_id?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const eventData = {
    ...data,
    organizer_id: user.id,
    private_token: data.is_private ? nanoid(24) : null,
    status: 'published' as const,
  };

  const { data: event, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, event };
}

export async function canEditEvent(eventId: string) {
  const supabase = await createClient();
  const viewer = await getViewerContext();
  if (!viewer.userId) return false;

  if (viewer.isAdmin) return true;

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, is_blocked')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return false;
  if (event.organizer_id === viewer.userId) return true;
  if (event.is_blocked) return false;
  if (viewer.isModerator) return true;

  const { data: mod } = await supabase
    .from('event_moderators')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', viewer.userId)
    .single();

  return !!mod;
}

export async function updateEvent(
  eventId: string,
  data: Partial<{
    title: string;
    description: string;
    languages: string[];
    category_id: string;
    starts_at: string;
    duration_minutes: number;
    is_online: boolean;
    is_free: boolean;
    price: number | null;
    currency: string | null;
    max_attendees: number | null;
    country: string | null;
    city: string | null;
    city_id: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    is_private: boolean;
    status: string;
    photos: string[];
  }>,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission to edit this event' };

  const { error } = await supabase.from('events').update(data).eq('id', eventId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getEventRaw(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  return data;
}

export async function getEvent(eventId: string) {
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([
    supabase
      .from('events_with_counts')
      .select('*')
      .eq('id', eventId)
      .maybeSingle(),
    getViewerContext(),
  ]);

  if (!data) return null;
  if (!canViewBlockedOwnedResource(viewer, data.organizer_id, {
    isBlocked: data.is_blocked,
    ownerBlocked: data.organizer_is_blocked,
  })) {
    return null;
  }

  return data;
}

export async function getEvents(filters: {
  country?: string;
  city?: string;
  city_id?: string;
  category?: string;
  categories?: string[];
  languages?: string[];
  date_from?: string;
  date_to?: string;
  is_free?: boolean;
  is_online?: boolean;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from('events_with_counts')
    .select('*')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('starts_at', { ascending: true });

  if (filters.country) query = query.eq('country', filters.country);
  if (filters.city_id) query = query.eq('city_id', filters.city_id);
  else if (filters.city) query = query.eq('city', filters.city);
  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category_id', filters.categories);
  } else if (filters.category) {
    query = query.eq('category_id', filters.category);
  }
  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages);
  }
  if (filters.date_from) query = query.gte('starts_at', filters.date_from);
  if (filters.date_to) query = query.lte('starts_at', filters.date_to);
  if (filters.is_free !== undefined) query = query.eq('is_free', filters.is_free);
  if (filters.is_online !== undefined) query = query.eq('is_online', filters.is_online);

  const limit = filters.limit || 12;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function toggleAttendance(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (existing && existing.status === 'going') {
    await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    return { going: false };
  }

  await supabase
    .from('event_attendees')
    .upsert({ event_id: eventId, user_id: user.id, status: 'going' });
  return { going: true };
}

export async function toggleFavorite(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('event_favorites')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase
      .from('event_favorites')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    return { favorited: false };
  }

  await supabase
    .from('event_favorites')
    .insert({ event_id: eventId, user_id: user.id });
  return { favorited: true };
}

export async function getUserAttendance(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { going: false, favorited: false };

  const [{ data: attendance }, { data: favorite }] = await Promise.all([
    supabase
      .from('event_attendees')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('event_favorites')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single(),
  ]);

  return {
    going: attendance?.status === 'going',
    favorited: !!favorite,
  };
}

export async function getUserEventStatuses(eventIds: string[]): Promise<{
  goingSet: Set<string>;
  favoritedSet: Set<string>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || eventIds.length === 0) return { goingSet: new Set(), favoritedSet: new Set() };

  const [{ data: attendances }, { data: favorites }] = await Promise.all([
    supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'going')
      .in('event_id', eventIds),
    supabase
      .from('event_favorites')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds),
  ]);

  return {
    goingSet: new Set((attendances || []).map((a) => a.event_id)),
    favoritedSet: new Set((favorites || []).map((f) => f.event_id)),
  };
}

export async function getEventAttendees(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_attendees')
    .select('user_id, status, profiles(display_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'going');
  return data || [];
}

export async function addComment(
  eventId: string,
  content: string,
  parentId?: string,
  options?: { quotedText?: string; quotedAuthorName?: string; replyToId?: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const isReply = !!parentId;
  let autoApprove = true;

  if (isReply) {
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    const isOrganizer = event?.organizer_id === user.id;

    const { data: mod } = await supabase
      .from('event_moderators')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSiteStaff = profile?.role === 'admin' || profile?.role === 'moderator';
    autoApprove = isOrganizer || !!mod || isSiteStaff;
  }

  const { data, error } = await supabase
    .from('event_comments')
    .insert({
      event_id: eventId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
      is_approved: autoApprove,
      quoted_text: options?.quotedText || null,
      quoted_author_name: options?.quotedAuthorName || null,
      reply_to_id: options?.replyToId || null,
    })
    .select('*, profiles(display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };
  return { comment: data };
}

export async function getComments(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_comments')
    .select('*, profiles(display_name, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function approveComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('event_comments')
    .update({ is_approved: true })
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getEventModerators(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_moderators')
    .select('user_id, created_at, profiles:user_id(id, display_name, avatar_url)')
    .eq('event_id', eventId);
  return data || [];
}

export async function addEventModerator(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('event_moderators')
    .insert({ event_id: eventId, user_id: userId });

  if (error) {
    if (error.code === '23505') return { error: 'Already a moderator' };
    return { error: error.message };
  }
  return { success: true };
}

export async function removeEventModerator(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditEvent(eventId);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('event_moderators')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadEventPhoto(formData: FormData, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('photo') as File;
  if (!file) return { error: 'No file' };

  const fileExt = file.name.split('.').pop();
  const filePath = `${eventId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('event-photos')
    .upload(filePath, file);

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from('event-photos').getPublicUrl(filePath);

  return { url: publicUrl };
}
