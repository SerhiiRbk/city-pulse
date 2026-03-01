'use server';

import { createClient } from '@/lib/supabase/server';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other';
export type TargetType = 'user' | 'event' | 'group' | 'comment';

export async function createReport(data: {
  target_type: TargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('target_type', data.target_type)
    .eq('target_id', data.target_id)
    .eq('status', 'pending')
    .single();

  if (existing) return { error: 'You already reported this' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    ...data,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getReports(filters: {
  status?: string;
  target_type?: string;
  limit?: number;
} = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'moderator'].includes(profile.role)) return [];

  let query = supabase
    .from('reports')
    .select('*, reporter:reporter_id(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(filters.limit || 50);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.target_type) query = query.eq('target_type', filters.target_type);

  const { data } = await query;
  return data || [];
}

export async function resolveReport(reportId: string, action: 'resolved' | 'dismissed') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('reports')
    .update({
      status: action,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function logActivity(data: {
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from('activity_logs').insert({
    user_id: data.userId || null,
    action: data.action,
    target_type: data.targetType || null,
    target_id: data.targetId || null,
    metadata: data.metadata || {},
  });
}
