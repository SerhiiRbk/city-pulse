'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { getUnreadMessagesCount } from '@/lib/actions/messages';

interface HeaderMessagesButtonProps {
  className?: string;
}

export function HeaderMessagesButton({ className }: HeaderMessagesButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadMessagesCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    }, 5000);

    const handleFocus = () => {
      void refreshUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshUnreadCount]);

  return (
    <Button variant="ghost" size="icon" className={className} asChild>
      <Link href="/messages" className="relative">
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
