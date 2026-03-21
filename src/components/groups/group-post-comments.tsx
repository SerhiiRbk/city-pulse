'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addGroupPostComment, deleteGroupPostComment, type GroupPostCommentWithProfile } from '@/lib/actions/group-posts';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupPostCommentsProps {
  postId: string;
  initialComments: GroupPostCommentWithProfile[];
  isAuthenticated: boolean;
  currentUserId?: string;
  canModerate?: boolean;
}

export function GroupPostComments({
  postId,
  initialComments,
  isAuthenticated,
  currentUserId,
  canModerate = false,
}: GroupPostCommentsProps) {
  const t = useTranslations('groups.detail');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    const result = await addGroupPostComment(postId, text.trim());
    if (result.error) {
      toast.error(result.error);
    } else if (result.comment) {
      setComments((prev) => [...prev, result.comment]);
      setText('');
    }
    setIsLoading(false);
  }

  async function handleDelete(commentId: string) {
    const result = await deleteGroupPostComment(commentId);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    toast.success(t('postCommentDeleted'));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('postCommentsTitle')}</h2>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('postNoComments')}</p>
      )}

      <div className="space-y-1">
        {comments.map((comment) => {
          const name = comment.profiles?.display_name || tCommon('user');
          const initials = name
            .split(' ')
            .map((chunk) => chunk[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const canDelete = currentUserId === comment.user_id || canModerate;

          return (
            <div key={comment.id} className="group flex gap-4 rounded-2xl p-4 transition-colors hover:bg-muted/30">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(comment.id)}
                      title={t('deletePostComment')}
                      className="ml-auto rounded-full p-1 text-muted-foreground opacity-100 transition-colors hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mt-6 flex gap-3 rounded-2xl bg-muted/30 p-4">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('postAddComment')}
            maxLength={500}
            className="border-0 bg-background shadow-sm"
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
