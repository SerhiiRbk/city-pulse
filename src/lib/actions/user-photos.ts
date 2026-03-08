'use server';

import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export interface UserPhoto {
  id: string;
  user_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

const MAX_PHOTOS = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_photos')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  return (data as UserPhoto[]) || [];
}

export async function uploadUserPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('photo') as File;
  if (!file) return { error: 'No file provided' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Only JPG, PNG, WebP allowed' };
  if (file.size > MAX_SIZE) return { error: 'File exceeds 5 MB limit' };

  const { count } = await supabase
    .from('user_photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) >= MAX_PHOTOS) return { error: `Maximum ${MAX_PHOTOS} photos allowed` };

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${user.id}/${nanoid()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('user-photos')
    .upload(filePath, file, { upsert: false });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from('user-photos').getPublicUrl(filePath);

  const { data: photo, error: insertError } = await supabase
    .from('user_photos')
    .insert({ user_id: user.id, url: publicUrl, sort_order: (count ?? 0) })
    .select()
    .single();
  if (insertError) return { error: insertError.message };

  return { success: true, photo: photo as UserPhoto };
}

export async function deleteUserPhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: photo } = await supabase
    .from('user_photos')
    .select('*')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();
  if (!photo) return { error: 'Photo not found' };

  const storagePath = extractStoragePath(photo.url);
  if (storagePath) {
    await supabase.storage.from('user-photos').remove([storagePath]);
  }

  const { error } = await supabase
    .from('user_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  const { data: currentAvatar } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single();
  if (currentAvatar?.avatar_url === photo.url) {
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
  }

  return { success: true };
}

export async function setPhotoAsAvatar(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: photo } = await supabase
    .from('user_photos')
    .select('url')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();
  if (!photo) return { error: 'Photo not found' };

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: photo.url })
    .eq('id', user.id);
  if (error) return { error: error.message };

  return { success: true, url: photo.url };
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = '/object/public/user-photos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
