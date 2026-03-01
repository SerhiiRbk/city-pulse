'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, LogIn, LogOut } from 'lucide-react';
import { toggleMembership, toggleSubscription } from '@/lib/actions/groups';
import { toast } from 'sonner';

interface GroupActionsProps {
  groupId: string;
  isMember: boolean;
  isSubscribed: boolean;
  role: string | null;
  isAuthenticated: boolean;
}

export function GroupActions({
  groupId,
  isMember: initMember,
  isSubscribed: initSub,
  role,
  isAuthenticated,
}: GroupActionsProps) {
  const t = useTranslations('groups');
  const [isMember, setIsMember] = useState(initMember);
  const [isSubscribed, setIsSubscribed] = useState(initSub);
  const [loading, setLoading] = useState(false);

  async function handleToggleMembership() {
    if (!isAuthenticated) return;
    setLoading(true);
    const result = await toggleMembership(groupId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setIsMember(result.joined ?? false);
    }
    setLoading(false);
  }

  async function handleToggleSubscription() {
    if (!isAuthenticated) return;
    const prev = isSubscribed;
    setIsSubscribed(!prev);
    const result = await toggleSubscription(groupId);
    if (result.error) {
      setIsSubscribed(prev);
      toast.error(result.error);
    }
  }

  if (!isAuthenticated) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="flex flex-wrap gap-2">
      {!isAdmin && (
        <Button
          variant={isMember ? 'secondary' : 'default'}
          onClick={handleToggleMembership}
          disabled={loading}
        >
          {isMember ? (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              {t('leave')}
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              {t('join')}
            </>
          )}
        </Button>
      )}
      <Button variant="outline" onClick={handleToggleSubscription}>
        {isSubscribed ? (
          <>
            <BellOff className="mr-2 h-4 w-4" />
            {t('unsubscribe')}
          </>
        ) : (
          <>
            <Bell className="mr-2 h-4 w-4" />
            {t('subscribe')}
          </>
        )}
      </Button>
    </div>
  );
}
