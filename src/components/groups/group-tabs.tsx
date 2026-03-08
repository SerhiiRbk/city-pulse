'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, History, Image as ImageIcon, MessageCircle, Send, Trash2, Users, Plus, FolderOpen } from 'lucide-react';
import { addGroupComment, deleteGroupComment } from '@/lib/actions/groups';
import { createAlbum } from '@/lib/actions/albums';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import type { Album } from '@/lib/actions/albums';

interface Member {
  user_id: string;
  role: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

interface GroupTabsProps {
  groupId: string;
  upcomingEvents: any[];
  pastEvents: any[];
  albums: Album[];
  comments: any[];
  members: Member[];
  canEdit: boolean;
  isAuthenticated: boolean;
  currentUserId?: string;
  goingEventIds?: string[];
  favoritedEventIds?: string[];
}

export function GroupTabs({
  groupId,
  upcomingEvents,
  pastEvents,
  albums: initialAlbums,
  comments: initialComments,
  members,
  canEdit,
  isAuthenticated,
  currentUserId,
  goingEventIds = [],
  favoritedEventIds = [],
}: GroupTabsProps) {
  const t = useTranslations('groups.detail');
  const goingSet = new Set(goingEventIds);
  const favSet = new Set(favoritedEventIds);
  const locale = useLocale();
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [albums, setAlbums] = useState(initialAlbums);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const result = await addGroupComment(groupId, commentText.trim());
      if (result.error) {
        toast.error(result.error);
      } else if (result.comment) {
        setComments((prev: any[]) => [result.comment, ...prev]);
        setCommentText('');
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
        setComments((prev: any[]) => prev.filter((c: any) => c.id !== commentId));
      }
    } catch {
      toast.error(t('commentDeleteError'));
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
    <Tabs defaultValue="upcoming">
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
        <TabsTrigger value="members" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <Users className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('membersList')}</span>
          <CountBadge count={members.length} />
        </TabsTrigger>
        <TabsTrigger value="comments" className="relative h-11 shrink-0 gap-1.5 px-3 py-2.5">
          <MessageCircle className="h-4 w-4" />
          <span className="whitespace-nowrap text-xs sm:text-sm">{t('commentsTitle')}</span>
          <CountBadge count={comments.length} />
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
              <EventCard key={event.id} event={event} isGoing={goingSet.has(event.id)} isFavorited={favSet.has(event.id)} isAuthenticated={isAuthenticated} />
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
              <EventCard key={event.id} event={event} isGoing={goingSet.has(event.id)} isFavorited={favSet.has(event.id)} isAuthenticated={isAuthenticated} />
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
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('writeComment')}
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

        {comments.length === 0 ? (
          <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
            <EmptyState icon="messages" title={t('noComments')} className="py-10" />
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment: any) => (
              <div key={comment.id} className="group hover:bg-muted/30 flex gap-4 rounded-2xl p-5 transition-colors">
                <Link href={`/profile/${comment.profiles?.id || comment.user_id}`}>
                  <Avatar className="h-10 w-10 shrink-0">
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
                      {formatCommentDate(comment.created_at)}
                    </span>
                    {currentUserId === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-destructive ml-auto rounded-full p-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                        title={t('deleteComment')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
