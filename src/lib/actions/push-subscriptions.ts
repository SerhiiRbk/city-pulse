'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Persist the browser's PushManager subscription so the server can
 * later send push payloads to this device. The `endpoint` is what
 * the push service uses to identify the device, and the
 * `(p256dh, auth)` pair encrypts the payload with the user's keys.
 */
export async function registerPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Drop the subscription identified by `endpoint`. Called when the
 * user toggles push off or when the browser unsubscribes (after a
 * permission revocation, etc).
 */
export async function unregisterPushSubscription(
  endpoint: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
