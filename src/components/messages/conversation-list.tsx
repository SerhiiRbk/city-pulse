'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">{t('noMessages')}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
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
                    {formatTimeAgo(conv.last_message_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground truncate text-sm">
                  {conv.status === 'pending' ? t('chatRequested') : (conv.last_message || '')}
                </p>
                {conv.unread_count > 0 && (
                  <Badge className="ml-auto h-5 min-w-[20px] justify-center rounded-full px-1.5 text-xs">
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

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString();
}
