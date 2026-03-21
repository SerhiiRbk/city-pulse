'use client';

import { useTranslations } from 'next-intl';
import { Bell, BellOff, Share2 } from 'lucide-react';
import { useGroupSubscription } from '@/hooks/use-group-subscription';
import { toast } from 'sonner';

interface GroupHeroActionsProps {
  groupId: string;
  initialSubscribed: boolean;
  isAuthenticated: boolean;
}

export function GroupHeroActions({ groupId, initialSubscribed, isAuthenticated }: GroupHeroActionsProps) {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');
  const { subscribed, toggle } = useGroupSubscription(groupId, initialSubscribed, isAuthenticated);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(tCommon('linkCopied'));
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated && (
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 hover:scale-110"
          title={subscribed ? t('unsubscribe') : t('subscribe')}
        >
          {subscribed ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </button>
      )}
      <button
        onClick={handleShare}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 hover:scale-110"
        title={tCommon('share')}
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
