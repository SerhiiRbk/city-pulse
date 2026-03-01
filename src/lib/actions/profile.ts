'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(
  updates: Partial<
    Pick<
      Profile,
      | 'display_name'
      | 'age'
      | 'hide_age'
      | 'city'
      | 'country'
      | 'languages'
      | 'interests'
      | 'bio'
      | 'is_available'
      | 'is_private'
      | 'social_links'
      | 'hide_events'
    >
  >,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const file = formData.get('avatar') as File;
  if (!file) {
    return { error: 'No file provided' };
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true, url: publicUrl };
}

export async function getInterests() {
  const supabase = await createClient();
  const { data } = await supabase.from('interests').select('*').order('slug');
  return data || [];
}

export async function getInterestCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('interest_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return data || [];
}
