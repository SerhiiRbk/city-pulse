'use server';

import { createClient } from '@/lib/supabase/server';
import { canEditGroup } from './groups';
import { nanoid } from 'nanoid';

export interface AlbumItem {
  id: string;
  album_id: string;
  type: 'image_upload' | 'image_url' | 'youtube';
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Album {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  items?: AlbumItem[];
}

export async function getGroupAlbums(groupId: string): Promise<Album[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_albums')
    .select('*, group_album_items(id)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  return (data || []).map((a: any) => ({
    ...a,
    item_count: a.group_album_items?.length || 0,
    items: undefined,
    group_album_items: undefined,
  }));
}

export async function getAlbum(albumId: string): Promise<Album | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_albums')
    .select('*')
    .eq('id', albumId)
    .single();
  return data;
}

export async function getAlbumItems(albumId: string): Promise<AlbumItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_album_items')
    .select('*')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true });
  return data || [];
}

export async function createAlbum(groupId: string, title: string, description?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowed = await canEditGroup(groupId);
  if (!allowed) return { error: 'No permission' };

  const { data, error } = await supabase
    .from('group_albums')
    .insert({ group_id: groupId, title, description: description || null, created_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  return { album: data };
}

export async function updateAlbum(albumId: string, updates: { title?: string; description?: string; cover_url?: string | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const album = await getAlbum(albumId);
  if (!album) return { error: 'Album not found' };

  const allowed = await canEditGroup(album.group_id);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('group_albums')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', albumId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAlbum(albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const album = await getAlbum(albumId);
  if (!album) return { error: 'Album not found' };

  const allowed = await canEditGroup(album.group_id);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('group_albums')
    .delete()
    .eq('id', albumId);

  if (error) return { error: error.message };
  return { success: true };
}

const MAX_UPLOAD_IMAGES = 20;

export async function addAlbumItem(
  albumId: string,
  type: 'image_upload' | 'image_url' | 'youtube',
  url: string,
  caption?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const album = await getAlbum(albumId);
  if (!album) return { error: 'Album not found' };

  const allowed = await canEditGroup(album.group_id);
  if (!allowed) return { error: 'No permission' };

  if (type === 'image_upload') {
    const { count } = await supabase
      .from('group_album_items')
      .select('id', { count: 'exact', head: true })
      .eq('album_id', albumId)
      .eq('type', 'image_upload');

    if ((count || 0) >= MAX_UPLOAD_IMAGES) {
      return { error: `Maximum ${MAX_UPLOAD_IMAGES} uploaded images per album` };
    }
  }

  const { count: totalCount } = await supabase
    .from('group_album_items')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId);

  const { data, error } = await supabase
    .from('group_album_items')
    .insert({
      album_id: albumId,
      type,
      url,
      caption: caption || null,
      sort_order: (totalCount || 0),
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (!album.cover_url && (type === 'image_upload' || type === 'image_url')) {
    await supabase
      .from('group_albums')
      .update({ cover_url: url })
      .eq('id', albumId);
  }

  return { item: data };
}

export async function removeAlbumItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: item } = await supabase
    .from('group_album_items')
    .select('*, group_albums(group_id)')
    .eq('id', itemId)
    .single();

  if (!item) return { error: 'Item not found' };

  const allowed = await canEditGroup((item as any).group_albums?.group_id);
  if (!allowed) return { error: 'No permission' };

  const { error } = await supabase
    .from('group_album_items')
    .delete()
    .eq('id', itemId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadAlbumImage(formData: FormData, albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const album = await getAlbum(albumId);
  if (!album) return { error: 'Album not found' };

  const allowed = await canEditGroup(album.group_id);
  if (!allowed) return { error: 'No permission' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file' };

  if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5 MB)' };

  const validTypes = ['image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) return { error: 'Only JPG and PNG images are allowed' };

  const { count } = await supabase
    .from('group_album_items')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId)
    .eq('type', 'image_upload');

  if ((count || 0) >= MAX_UPLOAD_IMAGES) {
    return { error: `Maximum ${MAX_UPLOAD_IMAGES} uploaded images per album` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${album.group_id}/${albumId}/${nanoid()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('group-album-images')
    .upload(filePath, file, { upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage
    .from('group-album-images')
    .getPublicUrl(filePath);

  return { url: publicUrl };
}
