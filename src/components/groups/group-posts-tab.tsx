'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  addGroupPostImageUrl,
  addGroupPostMediaFromAlbumItem,
  createGroupPost,
  deleteGroupPost,
  removeGroupPostMedia,
  updateGroupPost,
  uploadGroupPostImage,
} from '@/lib/actions/group-posts';
import { GroupPostMediaGallery } from '@/components/groups/group-post-media-gallery';
import type { GroupPostMedia, GroupPostType } from '@/types/database';
import {
  CalendarDays,
  ChevronDown,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Megaphone,
  Newspaper,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface PastEventOption {
  id: string;
  title: string;
  starts_at: string;
}

interface PostAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PostEvent {
  id: string;
  title: string;
  starts_at: string;
}

interface GroupGalleryImageOption {
  id: string;
  url: string;
  caption: string | null;
  album_id: string;
  album_title: string;
}

interface GroupPostItem {
  id: string;
  author_id: string;
  event_id: string | null;
  type: GroupPostType;
  title: string;
  content: string;
  published_at: string;
  profiles?: PostAuthor | null;
  events?: PostEvent | null;
  media?: GroupPostMedia[];
}

interface GroupPostsTabProps {
  groupId: string;
  initialPosts: GroupPostItem[];
  groupGalleryImages: GroupGalleryImageOption[];
  canEdit: boolean;
  pastEvents: PastEventOption[];
  initialRecapEventId?: string;
}

const POST_TYPE_STYLES: Record<GroupPostType, string> = {
  update: 'bg-primary/10 text-primary border-primary/15',
  announcement: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/15',
  event_recap: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/15',
};

const MAX_FILES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type PendingMedia =
  | { id: string; source: 'upload'; previewUrl: string; file: File }
  | { id: string; source: 'url'; previewUrl: string; url: string }
  | { id: string; source: 'gallery'; previewUrl: string; url: string; albumItemId: string; albumTitle: string };

interface PostComposerSubmitPayload {
  title: string;
  content: string;
  type: GroupPostType;
  eventId?: string;
  pendingMedia: PendingMedia[];
}

interface PostComposerProps {
  mode: 'create' | 'edit';
  initialTitle: string;
  initialContent: string;
  initialType: GroupPostType;
  initialEventId?: string;
  linkedEvent?: PostEvent | null;
  existingMedia?: GroupPostMedia[];
  pastEvents: PastEventOption[];
  recapCandidates: PastEventOption[];
  groupGalleryImages: GroupGalleryImageOption[];
  submitLabel: string;
  headerTitle: string;
  headerHint: string;
  loading: boolean;
  initialRecapEventId?: string;
  onSubmit: (payload: PostComposerSubmitPayload) => Promise<boolean>;
  onCancel?: () => void;
  onRemoveExistingMedia?: (mediaId: string) => Promise<void>;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getPostTypeMeta(type: GroupPostType, t: ReturnType<typeof useTranslations<'groups.detail'>>) {
  if (type === 'announcement') {
    return { label: t('postTypeAnnouncement'), Icon: Megaphone };
  }
  if (type === 'event_recap') {
    return { label: t('postTypeRecap'), Icon: CalendarDays };
  }
  return { label: t('postTypeUpdate'), Icon: Newspaper };
}

function PostComposer({
  mode,
  initialTitle,
  initialContent,
  initialType,
  initialEventId,
  linkedEvent,
  existingMedia = [],
  pastEvents,
  recapCandidates,
  groupGalleryImages,
  submitLabel,
  headerTitle,
  headerHint,
  loading,
  initialRecapEventId,
  onSubmit,
  onCancel,
  onRemoveExistingMedia,
}: PostComposerProps) {
  const t = useTranslations('groups.detail');
  const locale = useLocale();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [type, setType] = useState<GroupPostType>(initialType);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingMediaRef = useRef<PendingMedia[]>([]);

  useEffect(() => {
    pendingMediaRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(() => {
    return () => {
      pendingMediaRef.current
        .filter((item) => item.source === 'upload')
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const selectedEvent = (type === 'event_recap'
    ? recapCandidates.find((event) => event.id === selectedEventId)
      || pastEvents.find((event) => event.id === selectedEventId)
    : undefined) || linkedEvent || undefined;

  const attachedUrls = new Set([
    ...existingMedia.map((media) => media.url),
    ...pendingMedia.map((item) => item.previewUrl),
  ]);

  const availableSlots = MAX_FILES - existingMedia.length - pendingMedia.length;
  const availableGalleryImages = groupGalleryImages.filter((item) => !attachedUrls.has(item.url));

  function resetPendingMedia() {
    setPendingMedia((current) => {
      current
        .filter((item) => item.source === 'upload')
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setUrlValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removePendingMediaItem(itemId: string) {
    setPendingMedia((current) => current.filter((item) => {
      if (item.id === itemId) {
        if (item.source === 'upload') {
          URL.revokeObjectURL(item.previewUrl);
        }
        return false;
      }
      return true;
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function stageUploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (availableSlots <= 0) {
      toast.error(t('postMediaLimit'));
      return;
    }

    const acceptedFiles = files.slice(0, availableSlots);
    const invalidFile = acceptedFiles.find((file) => !IMAGE_TYPES.includes(file.type));
    if (invalidFile) {
      toast.error(t('postMediaTypes'));
      return;
    }

    const oversizedFile = acceptedFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      toast.error(t('postMediaTooLarge'));
      return;
    }

    const nextItems: PendingMedia[] = acceptedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      source: 'upload',
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setPendingMedia((current) => [...current, ...nextItems]);

    if (files.length > availableSlots) {
      toast.error(t('postMediaLimit'));
    }
  }

  function stageUrlMedia() {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    if (availableSlots <= 0) {
      toast.error(t('postMediaLimit'));
      return;
    }
    if (!isValidHttpUrl(trimmed)) {
      toast.error(t('postMediaInvalidUrl'));
      return;
    }
    if (attachedUrls.has(trimmed)) {
      toast.error(t('postMediaDuplicate'));
      return;
    }

    setPendingMedia((current) => [...current, {
      id: `url-${crypto.randomUUID()}`,
      source: 'url',
      previewUrl: trimmed,
      url: trimmed,
    }]);
    setUrlValue('');
  }

  function stageGalleryMedia(image: GroupGalleryImageOption) {
    if (availableSlots <= 0) {
      toast.error(t('postMediaLimit'));
      return;
    }
    if (attachedUrls.has(image.url)) {
      toast.error(t('postMediaDuplicate'));
      return;
    }

    setPendingMedia((current) => [...current, {
      id: `gallery-${image.id}`,
      source: 'gallery',
      previewUrl: image.url,
      url: image.url,
      albumItemId: image.id,
      albumTitle: image.album_title,
    }]);
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    if (type === 'event_recap' && !selectedEventId && !linkedEvent) {
      toast.error(t('postSelectEventRequired'));
      return;
    }

    const success = await onSubmit({
      title: title.trim(),
      content: content.trim(),
      type,
      eventId: type === 'event_recap' ? (selectedEventId || initialEventId) : undefined,
      pendingMedia,
    });

    if (!success) return;

    if (mode === 'create') {
      setTitle('');
      setContent('');
      setType('update');
      setSelectedEventId('');
      resetPendingMedia();
    }
  }

  return (
    <div className="space-y-4 px-5 py-5">
      <div className="border-b border-border/50 pb-4">
        <p className="text-sm font-semibold">{headerTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{headerHint}</p>
      </div>

      {mode === 'create' ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('postType')}</p>
            <Select
              value={type}
              onValueChange={(value) => {
                const nextType = value as GroupPostType;
                setType(nextType);
                if (nextType !== 'event_recap') {
                  setSelectedEventId('');
                } else if (!selectedEventId && initialRecapEventId) {
                  setSelectedEventId(initialRecapEventId);
                }
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">{t('postTypeUpdate')}</SelectItem>
                <SelectItem value="announcement">{t('postTypeAnnouncement')}</SelectItem>
                <SelectItem value="event_recap">{t('postTypeRecap')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'event_recap' && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('selectPastEvent')}</p>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={t('selectPastEventPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {recapCandidates.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${POST_TYPE_STYLES[type]}`}>
            {getPostTypeMeta(type, t).label}
          </span>
          {linkedEvent && (
            <span className="text-sm text-muted-foreground">
              {t('linkedEvent')}: {linkedEvent.title}
            </span>
          )}
        </div>
      )}

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('postTitle')}
        maxLength={200}
        className="h-11 rounded-xl"
      />

      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={type === 'event_recap' ? t('postContentRecapPlaceholder') : t('postContentPlaceholder')}
        maxLength={4000}
        className="min-h-[160px] resize-y rounded-2xl"
      />

      {selectedEvent && (
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedEvent.title}</span>
          <span className="ml-2">{formatDate(selectedEvent.starts_at, locale)}</span>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('postMediaTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('postMediaHint')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={stageUploadFiles}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={availableSlots <= 0 || loading}
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {t('postMediaAdd')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl"
                onClick={() => setShowUrlInput((value) => !value)}
                disabled={availableSlots <= 0 || loading}
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                {t('postMediaAddUrl')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl"
                onClick={() => setShowGalleryPicker((value) => !value)}
                disabled={availableSlots <= 0 || loading}
              >
                <Images className="mr-1.5 h-4 w-4" />
                {t('postMediaPickFromGallery')}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          {showUrlInput && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder={t('postMediaUrlPlaceholder')}
                className="h-11 rounded-xl"
              />
              <Button
                type="button"
                onClick={stageUrlMedia}
                className="min-h-11 rounded-xl"
                disabled={loading || !urlValue.trim() || availableSlots <= 0}
              >
                {t('postMediaUrlAdd')}
              </Button>
            </div>
          )}

          {showGalleryPicker && (
            <div className="rounded-2xl border border-border/60 bg-background p-3">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">{t('postMediaGalleryTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('postMediaGalleryHint')}</p>
              </div>
              {availableGalleryImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('postMediaEmptyGallery')}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableGalleryImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => stageGalleryMedia(image)}
                      className="group overflow-hidden rounded-2xl border border-border/60 bg-muted text-left transition-colors hover:border-primary/40"
                    >
                      <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" />
                      <div className="space-y-1 px-3 py-3">
                        <p className="truncate text-sm font-medium text-foreground">{image.album_title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {image.caption || t('postMediaAttachGallery')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {existingMedia.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('postMediaExisting')}</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {existingMedia.map((image) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background">
                    <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    {onRemoveExistingMedia && (
                      <button
                        type="button"
                        onClick={() => void onRemoveExistingMedia(image.id)}
                        className="absolute top-2 right-2 rounded-full bg-black/65 p-1.5 text-white transition-colors hover:bg-black/80"
                        title={t('postMediaRemove')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingMedia.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('postMediaPending')}</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {pendingMedia.map((image) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background">
                    <img src={image.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingMediaItem(image.id)}
                      className="absolute top-2 right-2 rounded-full bg-black/65 p-1.5 text-white transition-colors hover:bg-black/80"
                      title={t('postMediaRemove')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {image.source === 'gallery' && (
                      <div className="absolute right-2 bottom-2 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">
                        {image.albumTitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('postMediaMeta')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" className="rounded-xl" onClick={onCancel} disabled={loading}>
            {t('cancel')}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || !title.trim() || !content.trim() || (type === 'event_recap' && !selectedEventId && !linkedEvent)}
          className="rounded-xl"
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function GroupPostsTab({
  groupId,
  initialPosts,
  groupGalleryImages,
  canEdit,
  pastEvents,
  initialRecapEventId,
}: GroupPostsTabProps) {
  const t = useTranslations('groups.detail');
  const locale = useLocale();
  const [posts, setPosts] = useState(initialPosts);
  const [publishing, setPublishing] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const recapCandidates = useMemo(
    () => pastEvents.filter((event) => !posts.some((post) => post.type === 'event_recap' && post.event_id === event.id)),
    [pastEvents, posts],
  );

  async function processPendingMedia(postId: string, pendingMedia: PendingMedia[]) {
    const addedMedia: GroupPostMedia[] = [];
    let errors = 0;

    for (const item of pendingMedia) {
      let result:
        | { error?: string; media?: GroupPostMedia }
        | undefined;

      if (item.source === 'upload') {
        const formData = new FormData();
        formData.append('file', item.file);
        result = await uploadGroupPostImage(formData, postId);
      } else if (item.source === 'url') {
        result = await addGroupPostImageUrl(postId, item.url);
      } else if (item.source === 'gallery') {
        result = await addGroupPostMediaFromAlbumItem(postId, item.albumItemId);
      }

      if (result?.error) {
        errors += 1;
      } else if (result?.media) {
        addedMedia.push(result.media);
      }
    }

    return { addedMedia, errors };
  }

  async function handleCreatePost(payload: PostComposerSubmitPayload) {
    setPublishing(true);
    try {
      const result = await createGroupPost({
        groupId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        eventId: payload.type === 'event_recap' ? payload.eventId : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return false;
      }

      if (result.post) {
        const createdPost = result.post as GroupPostItem;
        const { addedMedia, errors } = await processPendingMedia(createdPost.id, payload.pendingMedia);
        setPosts((prev) => [{
          ...createdPost,
          media: addedMedia,
        }, ...prev]);

        if (errors > 0) {
          toast.success(t('postPublishedWithMediaWarning', { count: errors }));
        } else {
          toast.success(payload.type === 'event_recap' ? t('recapPublished') : t('postPublished'));
        }
      }

      return true;
    } catch {
      toast.error(t('postCreateError'));
      return false;
    } finally {
      setPublishing(false);
    }
  }

  async function handleSavePost(post: GroupPostItem, payload: PostComposerSubmitPayload) {
    setSavingPostId(post.id);
    try {
      const result = await updateGroupPost(post.id, {
        title: payload.title,
        content: payload.content,
      });

      if (result.error) {
        toast.error(result.error);
        return false;
      }

      const updatedPost = result.post as GroupPostItem | undefined;
      if (!updatedPost) return false;

      const { addedMedia, errors } = await processPendingMedia(post.id, payload.pendingMedia);
      const nextPost: GroupPostItem = {
        ...updatedPost,
        media: [...(updatedPost.media || []), ...addedMedia],
      };

      setPosts((prev) => prev.map((item) => (item.id === post.id ? nextPost : item)));
      setEditingPostId(null);

      if (errors > 0) {
        toast.success(t('postUpdatedWithMediaWarning', { count: errors }));
      } else {
        toast.success(t('postUpdated'));
      }

      return true;
    } catch {
      toast.error(t('postUpdateError'));
      return false;
    } finally {
      setSavingPostId(null);
    }
  }

  async function handleDelete(postId: string) {
    try {
      const result = await deleteGroupPost(postId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setEditingPostId((current) => (current === postId ? null : current));
      toast.success(t('postDeleted'));
    } catch {
      toast.error(t('postDeleteError'));
    }
  }

  async function handleRemoveMedia(postId: string, mediaId: string) {
    const result = await removeGroupPostMedia(mediaId);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    setPosts((prev) => prev.map((post) => (
      post.id === postId
        ? { ...post, media: (post.media || []).filter((media) => media.id !== mediaId) }
        : post
    )));
    toast.success(t('postMediaRemoved'));
  }

  return (
    <div className="space-y-6 pt-6">
      {canEdit && (
        <div className="overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-sm">
          <PostComposer
            mode="create"
            initialTitle=""
            initialContent=""
            initialType={initialRecapEventId ? 'event_recap' : 'update'}
            initialEventId={initialRecapEventId}
            pastEvents={pastEvents}
            recapCandidates={recapCandidates}
            groupGalleryImages={groupGalleryImages}
            submitLabel={initialRecapEventId ? t('publishRecap') : t('publishPost')}
            headerTitle={t('createPost')}
            headerHint={t('createPostHint')}
            loading={publishing}
            initialRecapEventId={initialRecapEventId}
            onSubmit={handleCreatePost}
          />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
          <EmptyState
            icon="messages"
            title={t('noPosts')}
            description={canEdit ? t('noPostsDescriptionEditor') : t('noPostsDescription')}
            className="py-10"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const { label: typeLabel, Icon: TypeIcon } = getPostTypeMeta(post.type, t);
            const isEditing = editingPostId === post.id;

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-sm"
              >
                <div className="flex items-start gap-3 border-b border-border/50 px-5 py-4">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{post.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {post.profiles?.display_name || 'User'}
                      </p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${POST_TYPE_STYLES[post.type]}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                        {typeLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.published_at, locale)}
                      </span>
                    </div>

                    {post.events && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{t('linkedEvent')}</span>
                        <Link href={`/events/${post.events.id}`} className="font-medium text-foreground hover:underline">
                          {post.events.title}
                        </Link>
                        <span>{formatDate(post.events.starts_at, locale)}</span>
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingPostId((current) => (current === post.id ? null : post.id))}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                        title={t('editPost')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(post.id)}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
                        title={t('deletePost')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <PostComposer
                    key={post.id}
                    mode="edit"
                    initialTitle={post.title}
                    initialContent={post.content}
                    initialType={post.type}
                    initialEventId={post.event_id || undefined}
                    linkedEvent={post.events}
                    existingMedia={post.media || []}
                    pastEvents={pastEvents}
                    recapCandidates={recapCandidates}
                    groupGalleryImages={groupGalleryImages}
                    submitLabel={t('savePost')}
                    headerTitle={t('editPost')}
                    headerHint={t('editPostHint')}
                    loading={savingPostId === post.id}
                    onSubmit={(payload) => handleSavePost(post, payload)}
                    onCancel={() => setEditingPostId(null)}
                    onRemoveExistingMedia={(mediaId) => handleRemoveMedia(post.id, mediaId)}
                  />
                ) : (
                  <div className="px-5 py-5">
                    <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                    <div className="mt-2">
                      <Link
                        href={`/groups/${groupId}/posts/${post.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('openPost')}
                      </Link>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {post.content}
                    </p>

                    {post.media && post.media.length > 0 && (
                      <div className="mt-4">
                        <GroupPostMediaGallery
                          images={post.media.map((image) => ({ id: image.id, url: image.url }))}
                          title={post.title}
                        />
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
