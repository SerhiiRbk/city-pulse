'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/event-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
}: GroupTabsProps) {
  const t = useTranslations('groups.detail');
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

  return (
    <Tabs defaultValue="upcoming" className="mt-8">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="upcoming" className="gap-2">
          <Calendar className="h-4 w-4" />
          {t('eventsTitle')}
          {upcomingEvents.length > 0 && (
            <span className="bg-primary/10 text-primary ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {upcomingEvents.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="past" className="gap-2">
          <History className="h-4 w-4" />
          {t('pastEventsTitle')}
          {pastEvents.length > 0 && (
            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {pastEvents.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="photos" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          {t('photosTitle')}
          {albums.length > 0 && (
            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {albums.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="members" className="gap-2">
          <Users className="h-4 w-4" />
          {t('membersList')}
          {members.length > 0 && (
            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {members.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="comments" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          {t('commentsTitle')}
          {comments.length > 0 && (
            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {comments.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Upcoming Events */}
      <TabsContent value="upcoming" className="pt-4">
        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t('noEvents')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Past Events */}
      <TabsContent value="past" className="pt-4">
        {pastEvents.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t('noPastEvents')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Photo Albums */}
      <TabsContent value="photos" className="pt-4">
        {canEdit && (
          <div className="mb-4">
            {showNewAlbum ? (
              <div className="space-y-3 rounded-lg border p-4">
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
                <Plus className="mr-2 h-4 w-4" />
                {t('createAlbum')}
              </Button>
            )}
          </div>
        )}

        {albums.length === 0 && !showNewAlbum ? (
          <p className="text-muted-foreground py-8 text-center">{t('noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/groups/${groupId}/albums/${album.id}`}
                className="group overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
              >
                <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FolderOpen className="text-muted-foreground/40 h-12 w-12" />
                    </div>
                  )}
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
      <TabsContent value="members" className="pt-4">
        {members.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t('noMembers')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((m) => (
              <Link
                key={m.user_id}
                href={`/profile/${m.user_id}`}
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={m.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{m.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.profiles?.display_name}
                </span>
                {m.role === 'admin' && (
                  <Badge variant="secondary" className="shrink-0 text-xs">{t('admin')}</Badge>
                )}
                {m.role === 'moderator' && (
                  <Badge variant="outline" className="shrink-0 text-xs">{t('moderator')}</Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Comments */}
      <TabsContent value="comments" className="pt-4">
        {isAuthenticated && (
          <div className="mb-6 flex gap-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('writeComment')}
              className="min-h-[80px] resize-none"
              maxLength={1000}
            />
            <Button
              size="icon"
              onClick={handleSendComment}
              disabled={sending || !commentText.trim()}
              className="mt-auto shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t('noComments')}</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3 rounded-lg border p-4">
                <Link href={`/profile/${comment.profiles?.id || comment.user_id}`}>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{comment.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${comment.profiles?.id || comment.user_id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {comment.profiles?.display_name || 'User'}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {formatCommentDate(comment.created_at)}
                    </span>
                    {currentUserId === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-destructive ml-auto text-xs"
                        title={t('deleteComment')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
