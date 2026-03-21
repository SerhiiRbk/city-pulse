'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, LogIn, LogOut } from 'lucide-react';
import { toggleMembership } from '@/lib/actions/groups';
import { useGroupSubscription } from '@/hooks/use-group-subscription';
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
  const [loading, setLoading] = useState(false);
  const { subscribed, toggle: toggleSub } = useGroupSubscription(groupId, initSub, isAuthenticated);

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

  if (!isAuthenticated) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      {!isAdmin && (
        <Button
          variant={isMember ? 'secondary' : 'default'}
          onClick={handleToggleMembership}
          disabled={loading}
          className="w-full rounded-full shadow-sm sm:w-auto"
        >
          {isMember ? (
            <>
              <LogOut className="mr-1.5 h-4 w-4" />
              {t('leave')}
            </>
          ) : (
            <>
              <LogIn className="mr-1.5 h-4 w-4" />
              {t('join')}
            </>
          )}
        </Button>
      )}
      <Button variant="outline" onClick={toggleSub} className="w-full rounded-full shadow-sm sm:w-auto">
        {subscribed ? (
          <>
            <BellOff className="mr-1.5 h-4 w-4" />
            {t('unsubscribe')}
          </>
        ) : (
          <>
            <Bell className="mr-1.5 h-4 w-4" />
            {t('subscribe')}
          </>
        )}
      </Button>
    </div>
  );
}
