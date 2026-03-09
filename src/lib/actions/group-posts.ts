'use server';

import { createClient } from '@/lib/supabase/server';
import { canEditGroup } from '@/lib/actions/groups';
import { nanoid } from 'nanoid';
import type { GroupPost, GroupPostComment, GroupPostMedia, GroupPostType } from '@/types/database';

const MAX_POST_IMAGES = 6;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface GroupPostAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface GroupPostEvent {
  id: string;
  title: string;
  starts_at: string;
}

export interface GroupPostWithRelations extends GroupPost {
  profiles: GroupPostAuthor | null;
  events: GroupPostEvent | null;
  media: GroupPostMedia[];
}

export interface GroupGalleryImageOption {
  id: string;
  url: string;
  caption: string | null;
  album_id: string;
  album_title: string;
}

export interface GroupPostCommentWithProfile extends GroupPostComment {
  profiles: GroupPostAuthor | null;
}

function normalizeSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeManyRelation<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeGroupPost(post: GroupPost & {
  profiles?: GroupPostAuthor | GroupPostAuthor[] | null;
  events?: GroupPostEvent | GroupPostEvent[] | null;
  media?: GroupPostMedia[] | null;
}): GroupPostWithRelations {
  return {
    ...post,
    profiles: normalizeSingleRelation(post.profiles),
    events: normalizeSingleRelation(post.events),
    media: normalizeManyRelation(post.media).sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getGroupPosts(groupId: string): Promise<GroupPostWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_posts')
    .select(`
      *,
      profiles:author_id(id, display_name, avatar_url),
      events:event_id(id, title, starts_at),
      media:group_post_media(*)
    `)
    .eq('group_id', groupId)
    .order('published_at', { ascending: false });

  return ((data || []) as Array<GroupPost & {
    profiles?: GroupPostAuthor[] | GroupPostAuthor | null;
    events?: GroupPostEvent[] | GroupPostEvent | null;
    media?: GroupPostMedia[] | null;
  }>).map((post) => normalizeGroupPost(post));
}

export async function getGroupPostByEventId(eventId: string): Promise<GroupPostWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_posts')
    .select(`
      *,
      profiles:author_id(id, display_name, avatar_url),
      events:event_id(id, title, starts_at),
      media:group_post_media(*)
    `)
    .eq('event_id', eventId)
    .eq('type', 'event_recap')
    .maybeSingle();

  return data
    ? normalizeGroupPost(data as GroupPost & {
      profiles?: GroupPostAuthor[] | GroupPostAuthor | null;
      events?: GroupPostEvent[] | GroupPostEvent | null;
      media?: GroupPostMedia[] | null;
    })
    : null;
}

export async function getGroupPost(postId: string): Promise<GroupPostWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_posts')
    .select(`
      *,
      profiles:author_id(id, display_name, avatar_url),
      events:event_id(id, title, starts_at),
      media:group_post_media(*)
    `)
    .eq('id', postId)
    .maybeSingle();

  return data
    ? normalizeGroupPost(data as GroupPost & {
      profiles?: GroupPostAuthor[] | GroupPostAuthor | null;
      events?: GroupPostEvent[] | GroupPostEvent | null;
      media?: GroupPostMedia[] | null;
    })
    : null;
}

export async function getGroupPostComments(postId: string): Promise<GroupPostCommentWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_post_comments')
    .select('*, profiles:user_id(id, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  return ((data || []) as Array<GroupPostComment & {
    profiles?: GroupPostAuthor[] | GroupPostAuthor | null;
  }>).map((comment) => ({
    ...comment,
    profiles: normalizeSingleRelation(comment.profiles),
  }));
}

export async function createGroupPost(data: {
  groupId: string;
  type: GroupPostType;
  title: string;
  content: string;
  eventId?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(data.groupId);
  if (!allowed) return { error: 'No permission to post in this group' };

  const title = data.title.trim();
  const content = data.content.trim();
  if (!title || !content) return { error: 'Title and content are required' };

  let eventId: string | null = data.eventId || null;

  if (data.type === 'event_recap') {
    if (!eventId) return { error: 'Event is required for a recap' };

    const { data: event } = await supabase
      .from('events')
      .select('id, group_id, starts_at, status')
      .eq('id', eventId)
      .single();

    if (!event || event.group_id !== data.groupId) {
      return { error: 'This event does not belong to the group' };
    }

    if (new Date(event.starts_at).getTime() > Date.now() && event.status !== 'completed') {
      return { error: 'You can only recap past events' };
    }

    const { data: existingRecap } = await supabase
      .from('group_posts')
      .select('id')
      .eq('event_id', eventId)
      .eq('type', 'event_recap')
      .maybeSingle();

    if (existingRecap) return { error: 'A recap for this event already exists' };
  } else {
    eventId = null;
  }

  const { data: post, error } = await supabase
    .from('group_posts')
    .insert({
      group_id: data.groupId,
      author_id: user.id,
      event_id: eventId,
      type: data.type,
      title,
      content,
    })
    .select(`
      *,
      profiles:author_id(id, display_name, avatar_url),
      events:event_id(id, title, starts_at),
      media:group_post_media(*)
    `)
    .single();

  if (error) return { error: error.message };
  return { success: true, post: normalizeGroupPost(post) };
}

export async function updateGroupPost(postId: string, data: { title: string; content: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: post } = await supabase
    .from('group_posts')
    .select('id, group_id')
    .eq('id', postId)
    .single();

  if (!post) return { error: 'Post not found' };

  const allowed = await canEditGroup(post.group_id);
  if (!allowed) return { error: 'No permission to edit this post' };

  const title = data.title.trim();
  const content = data.content.trim();
  if (!title || !content) return { error: 'Title and content are required' };

  const { data: updatedPost, error } = await supabase
    .from('group_posts')
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select(`
      *,
      profiles:author_id(id, display_name, avatar_url),
      events:event_id(id, title, starts_at),
      media:group_post_media(*)
    `)
    .single();

  if (error) return { error: error.message };
  return {
    success: true,
    post: normalizeGroupPost(updatedPost as GroupPost & {
      profiles?: GroupPostAuthor[] | GroupPostAuthor | null;
      events?: GroupPostEvent[] | GroupPostEvent | null;
      media?: GroupPostMedia[] | null;
    }),
  };
}

export async function addGroupPostComment(postId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const text = content.trim();
  if (!text) return { error: 'Comment is required' };

  const { data: post } = await supabase
    .from('group_posts')
    .select('id')
    .eq('id', postId)
    .single();

  if (!post) return { error: 'Post not found' };

  const { data: comment, error } = await supabase
    .from('group_post_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    })
    .select('*, profiles:user_id(id, display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };
  return {
    success: true,
    comment: {
      ...(comment as GroupPostComment),
      profiles: normalizeSingleRelation((comment as { profiles?: GroupPostAuthor[] | GroupPostAuthor | null }).profiles),
    } satisfies GroupPostCommentWithProfile,
  };
}

export async function deleteGroupPostComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: comment } = await supabase
    .from('group_post_comments')
    .select('id')
    .eq('id', commentId)
    .single();

  if (!comment) return { error: 'Comment not found' };

  const { error } = await supabase
    .from('group_post_comments')
    .delete()
    .eq('id', commentId);

  if (error) return { error: error.message };
  return { success: true };
}

async function getPostForEdit(postId: string) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('group_posts')
    .select('id, group_id')
    .eq('id', postId)
    .single();
  return { supabase, post };
}

async function ensureCanEditPost(postId: string) {
  const { supabase, post } = await getPostForEdit(postId);
  if (!post) return { supabase, error: 'Post not found' as const };
  const allowed = await canEditGroup(post.group_id);
  if (!allowed) return { supabase, error: 'No permission to edit this post' as const };
  return { supabase, post, error: null };
}

async function getPostMediaCount(supabase: Awaited<ReturnType<typeof createClient>>, postId: string) {
  const { count } = await supabase
    .from('group_post_media')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);
  return count ?? 0;
}

export async function addGroupPostImageUrl(postId: string, url: string, caption?: string) {
  const prepared = await ensureCanEditPost(postId);
  if (prepared.error || !prepared.post) return { error: prepared.error };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { error: 'Invalid image URL' };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { error: 'Only http and https URLs are allowed' };
  }

  const mediaCount = await getPostMediaCount(prepared.supabase, postId);
  if (mediaCount >= MAX_POST_IMAGES) {
    return { error: `Maximum ${MAX_POST_IMAGES} images allowed per post` };
  }

  const { data: media, error } = await prepared.supabase
    .from('group_post_media')
    .insert({
      post_id: postId,
      type: 'image',
      url: parsedUrl.toString(),
      caption: caption?.trim() || null,
      sort_order: mediaCount,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, media: media as GroupPostMedia };
}

export async function addGroupPostMediaFromAlbumItem(postId: string, albumItemId: string) {
  const prepared = await ensureCanEditPost(postId);
  if (prepared.error || !prepared.post) return { error: prepared.error };

  const { data: albumItem } = await prepared.supabase
    .from('group_album_items')
    .select('id, url, caption, type, album_id, group_albums!inner(group_id, title)')
    .eq('id', albumItemId)
    .single();

  if (!albumItem) return { error: 'Gallery image not found' };

  if (albumItem.type === 'youtube') return { error: 'Only image items can be attached' };

  const albumGroup = Array.isArray(albumItem.group_albums) ? albumItem.group_albums[0] : albumItem.group_albums;
  if (!albumGroup || albumGroup.group_id !== prepared.post.group_id) {
    return { error: 'This gallery image does not belong to the group' };
  }

  const mediaCount = await getPostMediaCount(prepared.supabase, postId);
  if (mediaCount >= MAX_POST_IMAGES) {
    return { error: `Maximum ${MAX_POST_IMAGES} images allowed per post` };
  }

  const { data: media, error } = await prepared.supabase
    .from('group_post_media')
    .insert({
      post_id: postId,
      type: 'image',
      url: albumItem.url,
      caption: albumItem.caption,
      sort_order: mediaCount,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, media: media as GroupPostMedia };
}

export async function removeGroupPostMedia(mediaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: media } = await supabase
    .from('group_post_media')
    .select('id, url, post_id, group_posts!inner(group_id)')
    .eq('id', mediaId)
    .single();

  if (!media) return { error: 'Post media not found' };

  const linkedPost = Array.isArray(media.group_posts) ? media.group_posts[0] : media.group_posts;
  const allowed = linkedPost ? await canEditGroup(linkedPost.group_id) : false;
  if (!allowed) return { error: 'No permission to edit this post' };

  const storagePath = extractStoragePath(media.url);
  if (storagePath) {
    await supabase.storage.from('group-post-images').remove([storagePath]);
  }

  const { error } = await supabase
    .from('group_post_media')
    .delete()
    .eq('id', mediaId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getGroupGalleryImages(groupId: string): Promise<GroupGalleryImageOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_album_items')
    .select('id, url, caption, album_id, type, group_albums!inner(group_id, title)')
    .eq('group_albums.group_id', groupId)
    .in('type', ['image_upload', 'image_url'])
    .order('created_at', { ascending: false })
    .limit(60);

  return (data || []).flatMap((item) => {
    const album = Array.isArray(item.group_albums) ? item.group_albums[0] : item.group_albums;
    if (!album) return [];
    return [{
      id: item.id,
      url: item.url,
      caption: item.caption,
      album_id: item.album_id,
      album_title: album.title,
    }];
  });
}

export async function uploadGroupPostImage(formData: FormData, postId: string) {
  const prepared = await ensureCanEditPost(postId);
  if (prepared.error || !prepared.post) return { error: prepared.error };

  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file provided' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: 'Only JPG, PNG, WebP allowed' };
  if (file.size > MAX_IMAGE_SIZE) return { error: 'File exceeds 5 MB limit' };

  const mediaCount = await getPostMediaCount(prepared.supabase, postId);
  if (mediaCount >= MAX_POST_IMAGES) {
    return { error: `Maximum ${MAX_POST_IMAGES} images allowed per post` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${prepared.post.group_id}/${postId}/${nanoid()}.${ext}`;

  const { error: uploadError } = await prepared.supabase.storage
    .from('group-post-images')
    .upload(filePath, file, { upsert: false });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = prepared.supabase.storage.from('group-post-images').getPublicUrl(filePath);

  const { data: media, error: insertError } = await prepared.supabase
    .from('group_post_media')
    .insert({
      post_id: postId,
      type: 'image',
      url: publicUrl,
      sort_order: mediaCount,
    })
    .select()
    .single();

  if (insertError) return { error: insertError.message };
  return { success: true, media: media as GroupPostMedia };
}

export async function deleteGroupPost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: post } = await supabase
    .from('group_posts')
    .select('id, group_id')
    .eq('id', postId)
    .single();

  if (!post) return { error: 'Post not found' };

  const allowed = await canEditGroup(post.group_id);
  if (!allowed) return { error: 'No permission to delete this post' };

  const { data: media } = await supabase
    .from('group_post_media')
    .select('url')
    .eq('post_id', postId);

  const storagePaths = (media || [])
    .map((item) => extractStoragePath(item.url))
    .filter(Boolean) as string[];

  if (storagePaths.length > 0) {
    await supabase.storage.from('group-post-images').remove(storagePaths);
  }

  const { error } = await supabase
    .from('group_posts')
    .delete()
    .eq('id', postId);

  if (error) return { error: error.message };
  return { success: true };
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = '/object/public/group-post-images/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
