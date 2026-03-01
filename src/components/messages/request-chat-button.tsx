'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { requestChat } from '@/lib/actions/messages';
import { toast } from 'sonner';

interface RequestChatButtonProps {
  targetUserId: string;
}

export function RequestChatButton({ targetUserId }: RequestChatButtonProps) {
  const t = useTranslations('messages');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await requestChat(targetUserId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.conversationId) {
      router.push(`/messages/${result.conversationId}`);
    }
    setLoading(false);
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={loading} className="flex items-center gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {t('requestChat')}
    </Button>
  );
}
