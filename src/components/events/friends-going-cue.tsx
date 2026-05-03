'use client';

import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FriendGoing } from '@/lib/actions/friends-going';

interface FriendsGoingCueProps {
  friends: FriendGoing[];
  variant?: 'card' | 'detail';
  className?: string;
}

export function FriendsGoingCue({
  friends,
  variant = 'card',
  className,
}: FriendsGoingCueProps) {
  const t = useTranslations('friends');
  if (friends.length === 0) return null;

  const isCard = variant === 'card';
  const visible = isCard ? friends.slice(0, 3) : friends.slice(0, 5);
  const remainder = friends.length - visible.length;

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        isCard ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <div className="flex -space-x-1.5">
        {visible.map((friend) => {
          const initial = (friend.display_name || '?').charAt(0).toUpperCase();
          return (
            <Avatar
              key={friend.user_id}
              className={cn(
                'ring-2 ring-background',
                isCard ? 'h-5 w-5' : 'h-7 w-7',
              )}
            >
              {friend.avatar_url ? (
                <AvatarImage src={friend.avatar_url} alt={friend.display_name ?? ''} />
              ) : null}
              <AvatarFallback className={cn(isCard && 'text-[10px]')}>{initial}</AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span className="text-muted-foreground font-medium">
        {t('goingCue', { count: friends.length })}
        {remainder > 0 && ` +${remainder}`}
      </span>
    </div>
  );
}
