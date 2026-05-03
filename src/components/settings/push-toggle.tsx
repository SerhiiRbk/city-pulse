'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/lib/actions/push-subscriptions';

interface PushToggleProps {
  vapidPublicKey: string | null;
}

/**
 * Push notifications opt-in toggle.
 *
 * Browser support is patchy:
 *   * Chrome, Edge, Firefox, Brave: full support;
 *   * Safari iOS 16.4+: only when the site is installed as a PWA;
 *   * Safari macOS 16+: works in regular tabs.
 *
 * We render a disabled switch + helper copy when push isn't
 * available so the user knows we're not silently broken.
 */
export function PushToggle({ vapidPublicKey }: PushToggleProps) {
  const t = useTranslations('settings.email.push');
  // Capability check is deterministic for a given environment, so
  // we compute it lazily in the initial state instead of in an
  // effect — keeps the component a single render in the common
  // case and satisfies React's "no setState in effect" rule.
  const [isSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!vapidPublicKey,
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isSupported) return;
    // Reflect existing subscription state on mount so the switch
    // shows the right value. setState here is the documented
    // "subscribe to external system" exception.
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, [isSupported]);

  async function subscribe() {
    if (!vapidPublicKey) return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error(t('permissionDenied'));
      return;
    }

    // PushManager wants a strict ArrayBuffer (not the SharedArrayBuffer-
    // backed Uint8Array TS infers); slice() guarantees that.
    const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength,
      ) as ArrayBuffer,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      toast.error(t('subscribeError'));
      return;
    }

    const result = await registerPushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
    if (!result.ok) {
      toast.error(result.error || t('subscribeError'));
      return;
    }

    setIsSubscribed(true);
    toast.success(t('subscribeSuccess'));
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setIsSubscribed(false);
      return;
    }
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await unregisterPushSubscription(endpoint);
    setIsSubscribed(false);
    toast.success(t('unsubscribeSuccess'));
  }

  function handleToggle(next: boolean) {
    startTransition(async () => {
      if (next) await subscribe();
      else await unsubscribe();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4">
      <div className="flex items-start gap-3">
        {isSubscribed ? (
          <Bell className="mt-0.5 h-5 w-5 text-primary" />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
        )}
        <div className="space-y-1">
          <Label htmlFor="push-toggle" className="text-sm font-medium">
            {t('label')}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isSupported ? t('helper') : t('unsupportedHelper')}
          </p>
        </div>
      </div>
      <Switch
        id="push-toggle"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={!isSupported || isPending}
        aria-label={t('label')}
      />
    </div>
  );
}

/**
 * Convert the URL-safe base64 VAPID public key the server hands us
 * into the Uint8Array the PushManager.subscribe() API expects.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
