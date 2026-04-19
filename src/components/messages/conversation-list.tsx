'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getConversations } from '@/lib/actions/messages';
import { formatRelativeTime } from '@/lib/format-relative-time';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  p1_name: string;
  p1_avatar: string | null;
  p2_name: string;
  p2_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId?: string;
}

export function ConversationList({ conversations, currentUserId, activeConversationId }: ConversationListProps) {
  const t = useTranslations('messages');
  const locale = useLocale();
  const [items, setItems] = useState(conversations);

  useEffect(() => {
    setItems(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === activeConversationId ? { ...item, unread_count: 0 } : item,
      ),
    );
  }, [activeConversationId]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const next = await getConversations();
      if (active) {
        setItems(next as Conversation[]);
      }
    }

    const conversationsP1 = supabase
      .channel(`conversation-list:p1:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1=eq.${currentUserId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const conversationsP2 = supabase
      .channel(`conversation-list:p2:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_2=eq.${currentUserId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`conversation-list:messages:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, 5000);

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      void supabase.removeChannel(conversationsP1);
      void supabase.removeChannel(conversationsP2);
      void supabase.removeChannel(messagesChannel);
    };
  }, [currentUserId]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="messages"
        title={t('noMessages')}
        description={t('noMessagesDescription')}
      >
        <Button asChild variant="outline">
          <Link href="/groups">{t('findGroupsCta')}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="divide-y">
      {items.map((conv) => {
        const isP1 = conv.participant_1 === currentUserId;
        const otherName = isP1 ? conv.p2_name : conv.p1_name;
        const otherAvatar = isP1 ? conv.p2_avatar : conv.p1_avatar;
        const isActive = conv.id === activeConversationId;

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className={cn(
              'flex items-center gap-3 p-3 transition-colors hover:bg-accent',
              isActive && 'bg-accent',
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherAvatar || undefined} />
              <AvatarFallback>{otherName?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{otherName}</span>
                {conv.last_message_at && (
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(conv.last_message_at, locale, t)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    'truncate text-sm',
                    conv.unread_count > 0 && !isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {conv.status === 'pending'
                    ? t('chatRequested')
                    : conv.status === 'declined'
                      ? t('chatDeclined')
                      : (conv.last_message || '')}
                </p>
                {conv.unread_count > 0 && !isActive && (
                  <Badge className="ml-auto h-5 min-w-[20px] shrink-0 justify-center rounded-full px-1.5 text-xs">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
