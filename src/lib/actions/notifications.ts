'use server';

import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push/web-push';

export async function getNotifications(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return count || 0;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return { success: true };
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data || {},
  });
  if (error) return { error: error.message };

  // Best-effort push fan-out. We swallow the result so push
  // failures (no VAPID keys, expired subscriptions, network blips)
  // never break the in-app notification path. The helper itself
  // already prunes 404/410 subscriptions, so we don't need to
  // chain bookkeeping here.
  const eventId =
    typeof params.data?.event_id === 'string' ? (params.data.event_id as string) : null;
  void sendPushToUser(params.userId, {
    title: params.title,
    body: params.body || '',
    url: eventId ? `/events/${eventId}` : '/notifications',
    tag: params.type,
  }).catch(() => undefined);

  return { success: true };
}
