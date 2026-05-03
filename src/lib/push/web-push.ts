import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Lazily configure web-push with our VAPID keys. We avoid throwing
 * at import time so route handlers and server actions can degrade
 * gracefully when the env isn't wired yet (preview deploys, local
 * dev without a VAPID pair).
 */
let configured = false;
let configuredOk = false;

function configure(): boolean {
  if (configured) return configuredOk;
  configured = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:notifications@localisio.com';

  if (!publicKey || !privateKey) {
    configuredOk = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configuredOk = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** Tag deduplicates notifications on the OS shade. */
  tag?: string;
}

/**
 * Send a push payload to every registered device for a given user.
 *
 * We use the service-role client so the function can be called from
 * server actions running as another user (e.g. the organiser
 * triggering an RSVP-confirmed notification for an attendee).
 *
 * Failures are intentionally non-throwing — the caller is usually
 * sending a notification on a hot path (RSVP, reminder, comment),
 * and the absence of a push must never break the primary action.
 *
 * Returns `{ delivered, pruned }`:
 *   * `delivered` is the number of subscriptions that accepted the
 *     payload (HTTP 201 / 202 from the push service);
 *   * `pruned` is the number of expired subscriptions we removed
 *     in response to 404 / 410 — Apple and Mozilla return these
 *     when the user has revoked the permission or cleared site
 *     data, and the spec is that we should drop the subscription.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ delivered: number; pruned: number }> {
  if (!configure()) return { delivered: 0, pruned: 0 };

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return { delivered: 0, pruned: 0 };

  let delivered = 0;
  let pruned = 0;
  const stalePushIds: number[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 24, // best-effort 24h replay window
          },
        );
        delivered += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription is gone for good — prune it.
          stalePushIds.push(sub.id);
          pruned += 1;
        }
        // Other errors (5xx, network) are transient; keep the row
        // and let the next cycle retry.
      }
    }),
  );

  if (stalePushIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', stalePushIds);
  }

  // Stamp last_seen on the rows that delivered so the cleanup cron
  // doesn't sweep them.
  if (delivered > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .not('id', 'in', `(${stalePushIds.join(',') || 'NULL'})`);
  }

  return { delivered, pruned };
}
