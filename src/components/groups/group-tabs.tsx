'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/event-card';
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
      toast.error('Failed to send comment');
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
      toast.error('Failed to delete comment');
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
      toast.error('Failed to create album');
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
      <TabsList variant="line" className="w-full justify-start border-b border-border/50">
        <TabsTrigger value="upcoming" className="gap-1.5 relative">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">{t('eventsTitle')}</span>
          <CountBadge count={upcomingEvents.length} active />
        </TabsTrigger>
        <TabsTrigger value="past" className="gap-1.5 relative">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">{t('pastEventsTitle')}</span>
          <CountBadge count={pastEvents.length} />
        </TabsTrigger>
        <TabsTrigger value="photos" className="gap-1.5 relative">
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('photosTitle')}</span>
          <CountBadge count={albums.length} />
        </TabsTrigger>
        <TabsTrigger value="members" className="gap-1.5 relative">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">{t('membersList')}</span>
          <CountBadge count={members.length} />
        </TabsTrigger>
        <TabsTrigger value="comments" className="gap-1.5 relative">
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('commentsTitle')}</span>
          <CountBadge count={comments.length} />
        </TabsTrigger>
      </TabsList>

      {/* Upcoming Events */}
      <TabsContent value="upcoming" className="pt-6">
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Calendar className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('noEvents')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} isGoing={goingSet.has(event.id)} isFavorited={favSet.has(event.id)} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Past Events */}
      <TabsContent value="past" className="pt-6">
        {pastEvents.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <History className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('noPastEvents')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateAlbum} disabled={creatingAlbum || !newAlbumTitle.trim()}>
                    {t('createAlbum')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewAlbum(false)}>
                    ✕
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowNewAlbum(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('createAlbum')}
              </Button>
            )}
          </div>
        )}

        {albums.length === 0 && !showNewAlbum ? (
          <div className="flex flex-col items-center py-16">
            <ImageIcon className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('noPhotos')}</p>
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
          <div className="flex flex-col items-center py-16">
            <Users className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('noMembers')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <Link
                key={m.user_id}
                href={`/profile/${m.user_id}`}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-2xl p-3 transition-colors"
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
          <div className="flex flex-col items-center py-16">
            <MessageCircle className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('noComments')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment: any) => (
              <div key={comment.id} className="hover:bg-muted/30 flex gap-4 rounded-2xl p-5 transition-colors">
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
                        className="text-muted-foreground hover:text-destructive ml-auto opacity-0 transition-opacity group-hover:opacity-100"
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
