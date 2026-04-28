'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LinkifiedText } from '@/components/ui/linkified-text';
import {
  addGroupPostComment,
  deleteGroupPostComment,
  approveGroupPostComment,
  type GroupPostCommentWithProfile,
} from '@/lib/actions/group-posts';
import { Check, CornerDownRight, Loader2, MessageSquareQuote, Reply, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface GroupPostCommentsProps {
  postId: string;
  initialComments: GroupPostCommentWithProfile[];
  isAuthenticated: boolean;
  currentUserId?: string;
  canModerate?: boolean;
}

interface ReplyTarget {
  commentId: string;
  parentId: string;
  authorName: string;
  quotedText?: string;
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
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce<Record<string, GroupPostCommentWithProfile[]>>((acc, c) => {
    if (c.parent_id) {
      (acc[c.parent_id] ||= []).push(c);
    }
    return acc;
  }, {});

  const handleReply = useCallback((comment: GroupPostCommentWithProfile) => {
    const parentId = comment.parent_id || comment.id;
    const selection = window.getSelection()?.toString().trim();
    const authorName = comment.profiles?.display_name || tCommon('user');
    let quotedText: string | undefined;
    if (selection && comment.content.includes(selection)) {
      quotedText = selection;
    }
    setReplyTarget({ commentId: comment.id, parentId, authorName, quotedText });
    setText('');
  }, [tCommon]);

  const handleQuoteFullComment = useCallback((comment: GroupPostCommentWithProfile) => {
    const parentId = comment.parent_id || comment.id;
    const authorName = comment.profiles?.display_name || tCommon('user');
    setReplyTarget({ commentId: comment.id, parentId, authorName, quotedText: comment.content });
    setText('');
  }, [tCommon]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    const result = await addGroupPostComment(
      postId,
      text.trim(),
      replyTarget?.parentId,
      replyTarget
        ? {
            quotedText: replyTarget.quotedText,
            quotedAuthorName: replyTarget.authorName,
            replyToId: replyTarget.commentId,
          }
        : undefined,
    );
    if (result.error) {
      toast.error(result.error);
    } else if (result.comment) {
      setComments((prev) => [...prev, result.comment]);
      setText('');
      setReplyTarget(null);
    }
    setIsLoading(false);
  }

  async function handleDelete(commentId: string) {
    const result = await deleteGroupPostComment(commentId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    toast.success(t('postCommentDeleted'));
  }

  async function handleApprove(commentId: string) {
    const result = await approveGroupPostComment(commentId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_approved: true } : c)),
      );
    }
  }

  function CommentItem({ comment, isReply = false }: { comment: GroupPostCommentWithProfile; isReply?: boolean }) {
    const name = comment.profiles?.display_name || tCommon('user');
    const initials = name
      .split(' ')
      .map((chunk) => chunk[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const isPending = !comment.is_approved;
    const canSee = !isPending || canModerate || comment.user_id === currentUserId;
    const canDelete = currentUserId === comment.user_id || canModerate;

    if (!canSee) return null;

    const targetComment = comment.reply_to_id
      ? comments.find((c) => c.id === comment.reply_to_id)
      : null;

    return (
      <div
        className={`group flex gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/30 ${
          isReply ? 'ml-10 sm:ml-14' : ''
        } ${isPending ? 'opacity-70' : ''}`}
      >
        <Avatar className="h-8 w-8 shrink-0">
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
            {isPending && (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                {t('postPendingApproval')}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {isPending && canModerate && (
                <button
                  type="button"
                  onClick={() => handleApprove(comment.id)}
                  className="rounded-full p-1 text-muted-foreground hover:text-green-600"
                  title={t('postApprove')}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => handleQuoteFullComment(comment)}
                  className="rounded-full p-1 text-muted-foreground hover:text-primary"
                  title={t('postQuoting')}
                >
                  <MessageSquareQuote className="h-3.5 w-3.5" />
                </button>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => handleReply(comment)}
                  className="rounded-full p-1 text-muted-foreground hover:text-primary"
                  title={t('postReply')}
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete(comment.id)}
                  title={t('deletePostComment')}
                  className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {comment.quoted_text && (
            <div className="mt-1.5 rounded-lg border-l-2 border-primary/30 bg-muted/50 px-3 py-1.5">
              {comment.quoted_author_name && (
                <span className="text-xs font-medium text-primary/70">
                  {comment.quoted_author_name}
                </span>
              )}
              <p className="text-xs text-muted-foreground italic line-clamp-3">
                <LinkifiedText text={comment.quoted_text} />
              </p>
            </div>
          )}

          {!comment.quoted_text && targetComment && isReply && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CornerDownRight className="h-3 w-3" />
              <span>{targetComment.profiles?.display_name || tCommon('user')}</span>
            </div>
          )}

          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            <LinkifiedText text={comment.content} />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('postCommentsTitle')}</h2>

      {topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('postNoComments')}</p>
      )}

      <div className="space-y-0.5">
        {topLevel.map((comment) => {
          const replies = repliesByParent[comment.id] || [];
          const visibleReplies = replies.filter(
            (r) => r.is_approved || canModerate || r.user_id === currentUserId,
          );
          return (
            <div key={comment.id}>
              <CommentItem comment={comment} />
              {visibleReplies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          );
        })}
      </div>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl bg-muted/30 p-4">
          {replyTarget && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground">
                {t('postReplyTo', { name: replyTarget.authorName })}
              </span>
              {replyTarget.quotedText && (
                <span className="ml-1 truncate text-xs italic text-muted-foreground/70">
                  &ldquo;{replyTarget.quotedText.slice(0, 80)}
                  {replyTarget.quotedText.length > 80 ? '...' : ''}&rdquo;
                </span>
              )}
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="ml-auto shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={replyTarget ? t('postReply') + '...' : t('postAddComment')}
              maxLength={500}
              className="min-h-[60px] resize-none border-0 bg-background shadow-sm"
              rows={2}
            />
            <Button type="submit" disabled={isLoading || !text.trim()} className="shrink-0 self-end rounded-xl px-6">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {tCommon('send')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
