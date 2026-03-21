'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (user.id === targetUserId) return { error: 'Cannot follow yourself' };

  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('subscriber_id')
    .eq('subscriber_id', user.id)
    .eq('target_user_id', targetUserId)
    .single();

  if (existing) {
    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('subscriber_id', user.id)
      .eq('target_user_id', targetUserId);
    return { following: false };
  }

  await supabase
    .from('user_subscriptions')
    .insert({ subscriber_id: user.id, target_user_id: targetUserId });
  return { following: true };
}

export async function isFollowing(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_subscriptions')
    .select('subscriber_id')
    .eq('subscriber_id', user.id)
    .eq('target_user_id', targetUserId)
    .single();

  return !!data;
}

export async function getProfileStats(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profile_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data || {
    events_created: 0,
    events_attended: 0,
    avg_organizer_rating: 0,
    review_count: 0,
    follower_count: 0,
    following_count: 0,
  };
}

export async function getUserBadges(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_badges')
    .select('*, badges(slug, icon, translations)')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });
  return data || [];
}
