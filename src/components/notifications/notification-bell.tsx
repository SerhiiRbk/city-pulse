'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Check, MessageCircle, Calendar, Users, AlertCircle } from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '@/lib/actions/notifications';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getUnreadCount().then(setUnreadCount);
  }, []);

  useEffect(() => {
    if (open) {
      getNotifications(20).then(setNotifications);
    }
  }, [open]);

  async function handleMarkAllRead() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id: string) {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function getIcon(type: string) {
    switch (type) {
      case 'new_message':
      case 'chat_request':
        return <MessageCircle className="h-4 w-4" />;
      case 'event_reminder_24h':
      case 'event_reminder_2h':
      case 'new_event':
      case 'group_new_event':
        return <Calendar className="h-4 w-4" />;
      case 'spots_almost_full':
        return <Users className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  }

  function getLink(n: Notification): string | null {
    if (n.data?.eventId) return `/events/${n.data.eventId}`;
    if (n.data?.conversationId) return `/messages/${n.data.conversationId}`;
    if (n.data?.groupId) return `/groups/${n.data.groupId}`;
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
              <Check className="mr-1 h-3 w-3" />
              {t('markAllRead')}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">{t('empty')}</p>
          ) : (
            notifications.map((n) => {
              const link = getLink(n);
              const content = (
                <div
                  className={cn(
                    'flex gap-3 border-b px-4 py-3 transition-colors hover:bg-accent',
                    !n.is_read && 'bg-primary/5',
                  )}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="text-muted-foreground mt-0.5">{getIcon(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', !n.is_read && 'font-medium')}>{n.title}</p>
                    {n.body && <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>}
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && <div className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />}
                </div>
              );

              return link ? (
                <Link key={n.id} href={link} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString();
}
