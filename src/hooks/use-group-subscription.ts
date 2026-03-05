import { useState, useEffect, useCallback } from 'react';
import { toggleSubscription } from '@/lib/actions/groups';
import { toast } from 'sonner';

const EVENT_NAME = 'group-subscription-change';

export function useGroupSubscription(groupId: string, initial: boolean, isAuthenticated: boolean) {
  const [subscribed, setSubscribed] = useState(initial);

  useEffect(() => {
    function onSync(e: Event) {
      const detail = (e as CustomEvent<{ groupId: string; subscribed: boolean }>).detail;
      if (detail.groupId === groupId) {
        setSubscribed(detail.subscribed);
      }
    }
    window.addEventListener(EVENT_NAME, onSync);
    return () => window.removeEventListener(EVENT_NAME, onSync);
  }, [groupId]);

  const toggle = useCallback(async () => {
    if (!isAuthenticated) return;
    const prev = subscribed;
    const next = !prev;
    setSubscribed(next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { groupId, subscribed: next } }));

    const result = await toggleSubscription(groupId);
    if (result.error) {
      setSubscribed(prev);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { groupId, subscribed: prev } }));
      toast.error(result.error);
    }
  }, [groupId, subscribed, isAuthenticated]);

  return { subscribed, toggle };
}
