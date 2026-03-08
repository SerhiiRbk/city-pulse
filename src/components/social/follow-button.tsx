'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { toggleFollow } from '@/lib/actions/social';

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
}

export function FollowButton({ targetUserId, isFollowing: initial }: FollowButtonProps) {
  const t = useTranslations('common');
  const [following, setFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await toggleFollow(targetUserId);
    if (!result.error) {
      setFollowing(result.following ?? false);
    }
    setLoading(false);
  }

  return (
    <Button
      variant={following ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : following ? (
        <UserMinus className="mr-1 h-4 w-4" />
      ) : (
        <UserPlus className="mr-1 h-4 w-4" />
      )}
      {following ? t('following') : t('follow')}
    </Button>
  );
}
