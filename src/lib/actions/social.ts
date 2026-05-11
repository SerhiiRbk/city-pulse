'use server';

import { createClient } from '@/lib/supabase/server';

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

export type ReputationTier = 'newcomer' | 'regular' | 'trusted' | 'elite';

export interface ProfileReputation {
  user_id: string;
  attended_count: number;
  no_show_count: number;
  going_and_attended_count: number;
  events_organized_count: number;
  avg_organizer_rating: number;
  organizer_review_count: number;
  follower_count: number;
  attended_category_count: number;
  attendance_rate: number | null;
  reliability_score: number;
  tier: ReputationTier;
}

export async function getProfileReputation(
  userId: string,
): Promise<ProfileReputation> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profile_reputation')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      user_id: userId,
      attended_count: 0,
      no_show_count: 0,
      going_and_attended_count: 0,
      events_organized_count: 0,
      avg_organizer_rating: 0,
      organizer_review_count: 0,
      follower_count: 0,
      attended_category_count: 0,
      attendance_rate: null,
      reliability_score: 0,
      tier: 'newcomer',
    };
  }
  return {
    ...data,
    attendance_rate:
      data.attendance_rate === null ? null : Number(data.attendance_rate),
    avg_organizer_rating: Number(data.avg_organizer_rating) || 0,
  } as ProfileReputation;
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
