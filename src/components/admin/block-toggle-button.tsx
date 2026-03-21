'use client';

import { useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  setEventBlocked,
  setGroupBlocked,
  setUserBlocked,
} from '@/lib/actions/admin-moderation';

interface AdminBlockToggleButtonProps {
  targetType: 'user' | 'event' | 'group';
  targetId: string;
  blocked: boolean;
  compact?: boolean;
}

export function AdminBlockToggleButton({
  targetType,
  targetId,
  blocked,
  compact = false,
}: AdminBlockToggleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);

    const nextBlocked = !blocked;
    const action =
      targetType === 'user'
        ? setUserBlocked
        : targetType === 'event'
          ? setEventBlocked
          : setGroupBlocked;

    const result = await action(targetId, nextBlocked);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `${targetType[0].toUpperCase() + targetType.slice(1)} ${nextBlocked ? 'blocked' : 'unblocked'}`,
      );
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <Button
      size={compact ? 'sm' : 'default'}
      variant={blocked ? 'outline' : 'destructive'}
      onClick={handleToggle}
      disabled={loading}
      className={compact ? 'h-8 rounded-lg' : 'rounded-xl'}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : blocked ? (
        <Unlock className="mr-1.5 h-4 w-4" />
      ) : (
        <Lock className="mr-1.5 h-4 w-4" />
      )}
      {blocked ? 'Unblock' : 'Block'}
    </Button>
  );
}
