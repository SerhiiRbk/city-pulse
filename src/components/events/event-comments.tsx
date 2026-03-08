'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { addComment } from '@/lib/actions/events';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
}

interface EventCommentsProps {
  eventId: string;
  initialComments: Comment[];
  isAuthenticated: boolean;
}

export function EventComments({ eventId, initialComments, isAuthenticated }: EventCommentsProps) {
  const t = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setIsLoading(true);

    const result = await addComment(eventId, text.trim());
    if (result.error) {
      toast.error(result.error);
    } else if (result.comment) {
      setComments((prev) => [...prev, result.comment as Comment]);
      setText('');
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('comments')}</h3>

      {comments.length === 0 && (
        <p className="text-muted-foreground text-sm">{t('noComments')}</p>
      )}

      <div className="space-y-1">
        {comments.map((comment) => {
          const name = comment.profiles?.display_name || tCommon('user');
          const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div key={comment.id} className="hover:bg-muted/30 flex gap-4 rounded-2xl p-4 transition-colors">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{name}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{comment.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="bg-muted/30 mt-6 flex gap-3 rounded-2xl p-4">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('addComment')}
            maxLength={500}
            className="bg-background border-0 shadow-sm"
          />
          <Button type="submit" disabled={isLoading || !text.trim()} className="shrink-0 rounded-xl px-6">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {tCommon('send')}
          </Button>
        </form>
      )}
    </div>
  );
}
