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
        <p className="text-muted-foreground text-sm">No comments yet.</p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => {
          const name = comment.profiles?.display_name || 'User';
          const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm">{comment.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('addComment')}
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={isLoading || !text.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}
