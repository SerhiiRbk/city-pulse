'use client';

import { type ComponentProps, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Check, CornerDownRight, History, Image as ImageIcon, MessageCircle, MessageSquareQuote, Reply, Send, Trash2, Users, Plus, FolderOpen, X } from 'lucide-react';
import { addGroupComment, deleteGroupComment, approveGroupComment } from '@/lib/actions/groups';
import { createAlbum } from '@/lib/actions/albums';
import { GroupPostsTab } from '@/components/groups/group-posts-tab';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import type { Album } from '@/lib/actions/albums';

interface Member {
  user_id: string;
  role: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

type GroupEventCardData = ComponentProps<typeof EventCard>['event'];

interface GroupComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  is_approved?: boolean;
  quoted_text?: string | null;
  quoted_author_name?: string | null;
  reply_to_id?: string | null;
  profiles?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
  } | null;
}

interface GroupReplyTarget {
  commentId: string;
  parentId: string;
  authorName: string;
  quotedText?: string;
}

interface GroupTabsProps {
  groupId: string;
  upcomingEvents: GroupEventCardData[];
  pastEvents: GroupEventCardData[];
  posts: ComponentProps<typeof GroupPostsTab>['initialPosts'];
  groupGalleryImages: ComponentProps<typeof GroupPostsTab>['groupGalleryImages'];
  albums: Album[];
  comments: GroupComment[];
  members: Member[];
  canEdit: boolean;
  isAuthenticated: boolean;
  currentUserId?: string;
  goingEventIds?: string[];
  waitlistedEventIds?: string[];
  favoritedEventIds?: string[];
  initialTab?: string;
  initialRecapEventId?: string;
}

export function GroupTabs({
  groupId,
  upcomingEvents,
  pastEvents,
  posts,
  groupGalleryImages,
  albums: initialAlbums,
  comments: initialComments,
  members,
  canEdit,
  isAuthenticated,
  currentUserId,
  goingEventIds = [],
  waitlistedEventIds = [],
  favoritedEventIds = [],
  initialTab = 'upcoming',
  initialRecapEventId,
}: GroupTabsProps) {
  const t = useTranslations('groups.detail');
  const goingSet = new Set(goingEventIds);
  const waitlistSet = new Set(waitlistedEventIds);
  const favSet = new Set(favoritedEventIds);
  const locale = useLocale();
  const router = useRouter();
  const [comments, setComments] = useState<GroupComment[]>(initialComments);
  const [albums, setAlbums] = useState(initialAlbums);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [replyTarget, setReplyTarget] = useState<GroupReplyTarget | null>(null);

  const topLevelComments = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce<Record<string, GroupComment[]>>((acc, c) => {
    if (c.parent_id) {
      (acc[c.parent_id] ||= []).push(c);
    }
    return acc;
  }, {});

  const handleReply = useCallback((comment: GroupComment) => {
    const parentId = comment.parent_id || comment.id;
    const selection = window.getSelection()?.toString().trim();
    const authorName = comment.profiles?.display_name || 'User';
    let quotedText: string | undefined;
    if (selection && comment.content.includes(selection)) {
      quotedText = selection;
    }
    setReplyTarget({ commentId: comment.id, parentId, authorName, quotedText });
    setCommentText('');
  }, []);

  const handleQuoteFullComment = useCallback((comment: GroupComment) => {
    const parentId = comment.parent_id || comment.id;
    const authorName = comment.profiles?.display_name || 'User';
    setReplyTarget({ commentId: comment.id, parentId, authorName, quotedText: comment.content });
    setCommentText('');
  }, []);

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const result = await addGroupComment(
        groupId,
        commentText.trim(),
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
        setComments((prev) => [...prev, result.comment as GroupComment]);
        setCommentText('');
        setReplyTarget(null);
      }
    } catch {
      toast.error(t('commentSendError'));
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const result = await deleteGroupComment(commentId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
      }
    } catch {
      toast.error(t('commentDeleteError'));
    }
  }

  async function handleApproveComment(commentId: string) {
    const result = await approveGroupComment(commentId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_approved: true } : c)),
      );
    }
  }

  async function handleCreateAlbum() {
    if (!newAlbumTitle.trim()) return;
    setCreatingAlbum(true);
    try {
      const result = await createAlbum(groupId, newAlbumTitle.trim(), newAlbumDesc.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
      } else if (result.album) {
        setAlbums((prev) => [{ ...result.album, item_count: 0 } as Album, ...prev]);
        setNewAlbumTitle('');
        setNewAlbumDesc('');
        setShowNewAlbum(false);
        toast.success(t('albumCreated'));
        router.push(`/groups/${groupId}/albums/${result.album.id}`);
      }
    } catch {
      toast.error(t('albumCreateError'));
    } finally {
      setCreatingAlbum(false);
    }
  }

  function formatCommentDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function CountBadge({ count, active }: { count: number; active?: boolean }) {
    if (count === 0) return null;
    return (
      <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        {count}
      </span>
    );
  }

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList variant="line" className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-card p-1 shadow-sm scrollbar-none">
        <TabsTrigger value="upcoming" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <Calendar className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('eventsTitle')}</span>
          <CountBadge count={upcomingEvents.length} active />
        </TabsTrigger>
        <TabsTrigger value="past" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <History className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('pastEventsTitle')}</span>
          <CountBadge count={pastEvents.length} />
        </TabsTrigger>
        <TabsTrigger value="photos" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <ImageIcon className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('photosTitle')}</span>
          <CountBadge count={albums.length} />
        </TabsTrigger>
        <TabsTrigger value="posts" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <MessageCircle className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('postsTitle')}</span>
          <CountBadge count={posts.length} />
        </TabsTrigger>
        <TabsTrigger value="members" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <Users className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('membersList')}</span>
          <CountBadge count={members.length} />
        </TabsTrigger>
        <TabsTrigger value="comments" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <MessageCircle className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('commentsTitle')}</span>
          <CountBadge count={topLevelComments.length} />
        </TabsTrigger>
      </TabsList>

      {/* Upcoming Events */}
      <TabsContent value="upcoming" className="pt-6">
        {upcomingEvents.length === 0 ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="events" title={t('noEvents')} className="py-10" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} isGoing={goingSet.has(event.id)} isWaitlisted={waitlistSet.has(event.id)} isFavorited={favSet.has(event.id)} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Past Events */}
      <TabsContent value="past" className="pt-6">
        {pastEvents.length === 0 ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="calendar" title={t('noPastEvents')} className="py-10" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} isGoing={goingSet.has(event.id)} isWaitlisted={waitlistSet.has(event.id)} isFavorited={favSet.has(event.id)} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Photo Albums */}
      <TabsContent value="photos" className="pt-6">
        {canEdit && (
          <div className="mb-5">
            {showNewAlbum ? (
              <div className="bg-muted/50 space-y-3 rounded-xl p-5">
                <Input
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder={t('albumTitle')}
                  maxLength={200}
                />
                <Input
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder={t('albumDescription')}
                  maxLength={1000}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" className="w-full sm:w-auto" onClick={handleCreateAlbum} disabled={creatingAlbum || !newAlbumTitle.trim()}>
                    {t('createAlbum')}
                  </Button>
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => setShowNewAlbum(false)}>
                    ✕
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setShowNewAlbum(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('createAlbum')}
              </Button>
            )}
          </div>
        )}

        {albums.length === 0 && !showNewAlbum ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="photos" title={t('noPhotos')} className="py-10" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/groups/${groupId}/albums/${album.id}`}
                className="group overflow-hidden rounded-2xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FolderOpen className="text-muted-foreground/30 h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-medium">{album.title}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t('items', { count: album.item_count || 0 })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="posts">
        <GroupPostsTab
          groupId={groupId}
          initialPosts={posts}
          groupGalleryImages={groupGalleryImages}
          canEdit={canEdit}
          pastEvents={pastEvents}
          initialRecapEventId={initialRecapEventId}
        />
      </TabsContent>

      {/* Members */}
      <TabsContent value="members" className="pt-6">
        {members.length === 0 ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="groups" title={t('noMembers')} className="py-10" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <Link
                key={m.user_id}
                href={`/profile/${m.user_id}`}
                className="group hover:bg-muted/50 flex items-center gap-3 rounded-2xl p-3 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                  <AvatarImage src={m.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{m.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.profiles?.display_name}</span>
                  {(m.role === 'admin' || m.role === 'moderator') && (
                    <span className="text-muted-foreground text-xs capitalize">{t(m.role as 'admin' | 'moderator')}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Comments */}
      <TabsContent value="comments" className="pt-6">
        {isAuthenticated && (
          <div className="bg-muted/30 mb-6 rounded-xl p-4">
            {replyTarget && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {t('replyTo', { name: replyTarget.authorName })}
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
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTarget ? t('reply') + '...' : t('writeComment')}
              className="bg-background mb-3 min-h-[80px] resize-none rounded-lg border-0 shadow-sm"
              maxLength={1000}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSendComment}
                disabled={sending || !commentText.trim()}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {t('send')}
              </Button>
            </div>
          </div>
        )}

        {topLevelComments.length === 0 ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="messages" title={t('noComments')} className="py-10" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {topLevelComments.map((comment) => {
              const replies = repliesByParent[comment.id] || [];
              const visibleReplies = replies.filter(
                (r) => r.is_approved !== false || canEdit || r.user_id === currentUserId,
              );
              return (
                <div key={comment.id}>
                  <GroupCommentItem
                    comment={comment}
                    isReply={false}
                    canModerate={canEdit}
                    currentUserId={currentUserId}
                    isAuthenticated={isAuthenticated}
                    comments={comments}
                    onReply={handleReply}
                    onQuote={handleQuoteFullComment}
                    onDelete={handleDeleteComment}
                    onApprove={handleApproveComment}
                    formatDate={formatCommentDate}
                    t={t}
                  />
                  {visibleReplies.map((reply) => (
                    <GroupCommentItem
                      key={reply.id}
                      comment={reply}
                      isReply
                      canModerate={canEdit}
                      currentUserId={currentUserId}
                      isAuthenticated={isAuthenticated}
                      comments={comments}
                      onReply={handleReply}
                      onQuote={handleQuoteFullComment}
                      onDelete={handleDeleteComment}
                      onApprove={handleApproveComment}
                      formatDate={formatCommentDate}
                      t={t}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function GroupCommentItem({
  comment,
  isReply,
  canModerate,
  currentUserId,
  isAuthenticated,
  comments,
  onReply,
  onQuote,
  onDelete,
  onApprove,
  formatDate,
  t,
}: {
  comment: GroupComment;
  isReply: boolean;
  canModerate: boolean;
  currentUserId?: string;
  isAuthenticated: boolean;
  comments: GroupComment[];
  onReply: (c: GroupComment) => void;
  onQuote: (c: GroupComment) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  formatDate: (d: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const isPending = comment.is_approved === false;
  const canSee = !isPending || canModerate || comment.user_id === currentUserId;
  const canDelete = comment.user_id === currentUserId || canModerate;

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
      <Link href={`/profile/${comment.profiles?.id || comment.user_id}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback>{comment.profiles?.display_name?.[0] || '?'}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${comment.profiles?.id || comment.user_id}`}
            className="text-sm font-semibold hover:underline"
          >
            {comment.profiles?.display_name || 'User'}
          </Link>
          <span className="text-muted-foreground text-xs">
            {formatDate(comment.created_at)}
          </span>
          {isPending && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
              {t('pendingApproval')}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isPending && canModerate && (
              <button
                type="button"
                onClick={() => onApprove(comment.id)}
                className="rounded-full p-1 text-muted-foreground hover:text-green-600"
                title={t('approve')}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => onQuote(comment)}
                className="rounded-full p-1 text-muted-foreground hover:text-primary"
                title={t('quoting')}
              >
                <MessageSquareQuote className="h-3.5 w-3.5" />
              </button>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="rounded-full p-1 text-muted-foreground hover:text-primary"
                title={t('reply')}
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                title={t('deleteComment')}
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
              {comment.quoted_text}
            </p>
          </div>
        )}

        {!comment.quoted_text && targetComment && isReply && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CornerDownRight className="h-3 w-3" />
            <span>{targetComment.profiles?.display_name || 'User'}</span>
          </div>
        )}

        <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
