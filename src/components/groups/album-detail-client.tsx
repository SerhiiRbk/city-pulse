'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  ArrowLeft, ImagePlus, LinkIcon, Youtube, Trash2, Pencil,
  ChevronLeft, ChevronRight, X, ExternalLink, Upload,
} from 'lucide-react';
import {
  updateAlbum, deleteAlbum, addAlbumItem, removeAlbumItem, uploadAlbumImage,
  type Album, type AlbumItem,
} from '@/lib/actions/albums';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface AlbumDetailClientProps {
  album: Album;
  items: AlbumItem[];
  groupId: string;
  canEdit: boolean;
}

export function AlbumDetailClient({ album, items: initialItems, groupId, canEdit }: AlbumDetailClientProps) {
  const t = useTranslations('groups.detail');
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState(initialItems);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(album.title);
  const [editDesc, setEditDesc] = useState(album.description || '');
  const [saving, setSaving] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlCaption, setImageUrlCaption] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeCaption, setYoutubeCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [addingYt, setAddingYt] = useState(false);

  const uploadCount = items.filter((i) => i.type === 'image_upload').length;

  async function handleSaveAlbum() {
    setSaving(true);
    try {
      const result = await updateAlbum(album.id, { title: editTitle.trim(), description: editDesc.trim() || undefined });
      if (result.error) toast.error(result.error);
      else {
        toast.success(t('albumUpdated'));
        setEditing(false);
        router.refresh();
      }
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  }

  async function handleDeleteAlbum() {
    if (!confirm(t('deleteAlbumConfirm'))) return;
    const result = await deleteAlbum(album.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success(t('albumDeleted'));
      router.push(`/groups/${groupId}`);
    }
  }

  async function handleAddImageUrl() {
    if (!imageUrl.trim()) return;
    setAddingUrl(true);
    try {
      const result = await addAlbumItem(album.id, 'image_url', imageUrl.trim(), imageUrlCaption.trim() || undefined);
      if (result.error) toast.error(result.error);
      else if (result.item) {
        setItems((prev) => [...prev, result.item as AlbumItem]);
        setImageUrl('');
        setImageUrlCaption('');
        toast.success(t('itemAdded'));
      }
    } catch { toast.error('Error'); }
    finally { setAddingUrl(false); }
  }

  async function handleAddYoutube() {
    if (!youtubeUrl.trim()) return;
    const ytId = extractYouTubeId(youtubeUrl.trim());
    if (!ytId) { toast.error('Invalid YouTube URL'); return; }
    setAddingYt(true);
    try {
      const result = await addAlbumItem(album.id, 'youtube', youtubeUrl.trim(), youtubeCaption.trim() || undefined);
      if (result.error) toast.error(result.error);
      else if (result.item) {
        setItems((prev) => [...prev, result.item as AlbumItem]);
        setYoutubeUrl('');
        setYoutubeCaption('');
        toast.success(t('itemAdded'));
      }
    } catch { toast.error('Error'); }
    finally { setAddingYt(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    let added = 0;
    for (const file of files) {
      if (uploadCount + added >= 20) {
        toast.error(t('uploadLimit'));
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: file too large (max 5 MB)`);
        continue;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name}: only JPG/PNG allowed`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      const uploadResult = await uploadAlbumImage(fd, album.id);
      if (uploadResult.error) { toast.error(uploadResult.error); continue; }
      const itemResult = await addAlbumItem(album.id, 'image_upload', uploadResult.url!);
      if (itemResult.error) { toast.error(itemResult.error); continue; }
      if (itemResult.item) {
        setItems((prev) => [...prev, itemResult.item as AlbumItem]);
        added++;
      }
    }
    if (added > 0) toast.success(`${added} image(s) uploaded`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleRemoveItem(itemId: string) {
    const result = await removeAlbumItem(itemId);
    if (result.error) toast.error(result.error);
    else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success(t('itemDeleted'));
    }
  }

  const viewableItems = items.filter((i) => i.type !== 'youtube');

  function openLightbox(item: AlbumItem) {
    const idx = viewableItems.findIndex((v) => v.id === item.id);
    if (idx >= 0) setLightboxIndex(idx);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={`/groups/${groupId}`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" />
        {t('backToAlbums')}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        {editing ? (
          <div className="flex-1 space-y-2">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} />
            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder={t('albumDescription')} maxLength={1000} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveAlbum} disabled={saving || !editTitle.trim()}>
                {saving ? '...' : t('editAlbum')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>✕</Button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">{album.title}</h1>
            {album.description && <p className="text-muted-foreground mt-1">{album.description}</p>}
          </div>
        )}
        {canEdit && !editing && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {t('editAlbum')}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteAlbum}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t('deleteAlbum')}
            </Button>
          </div>
        )}
      </div>

      {/* Add items controls */}
      {canEdit && (
        <div className="mb-6 rounded-lg border p-4">
          <Tabs defaultValue="upload">
            <TabsList className="mb-3">
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {t('uploadImages')}
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                {t('addImageUrl')}
              </TabsTrigger>
              <TabsTrigger value="youtube" className="gap-1.5">
                <Youtube className="h-3.5 w-3.5" />
                {t('addYouTube')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">{t('uploadLimit')} ({uploadCount}/20)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  onChange={handleFileUpload}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
                  disabled={uploading || uploadCount >= 20}
                />
                {uploading && <p className="text-muted-foreground text-sm">Uploading...</p>}
              </div>
            </TabsContent>

            <TabsContent value="url">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('imageUrlPlaceholder')}
                  className="min-w-[250px] flex-1"
                />
                <Input
                  value={imageUrlCaption}
                  onChange={(e) => setImageUrlCaption(e.target.value)}
                  placeholder={t('caption')}
                  className="w-48"
                />
                <Button onClick={handleAddImageUrl} disabled={addingUrl || !imageUrl.trim()} size="sm">
                  {t('add')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="youtube">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder={t('youtubeUrlPlaceholder')}
                  className="min-w-[250px] flex-1"
                />
                <Input
                  value={youtubeCaption}
                  onChange={(e) => setYoutubeCaption(e.target.value)}
                  placeholder={t('caption')}
                  className="w-48"
                />
                <Button onClick={handleAddYoutube} disabled={addingYt || !youtubeUrl.trim()} size="sm">
                  {t('add')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Items grid */}
      {items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('noPhotos')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => {
            if (item.type === 'youtube') {
              const ytId = extractYouTubeId(item.url);
              return (
                <div key={item.id} className="group relative overflow-hidden rounded-lg border">
                  <div className="relative aspect-video">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                      title={item.caption || 'YouTube video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    {item.caption && <span className="min-w-0 flex-1 truncate text-xs">{item.caption}</span>}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
                      title={t('openOnYouTube')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="group relative">
                <button
                  onClick={() => openLightbox(item)}
                  className="relative aspect-square w-full overflow-hidden rounded-lg"
                >
                  <img
                    src={item.url}
                    alt={item.caption || ''}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
                {(item.caption || canEdit) && (
                  <div className="mt-1 flex items-center gap-1">
                    {item.caption && <span className="min-w-0 flex-1 truncate text-xs">{item.caption}</span>}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-muted-foreground hover:text-destructive ml-auto shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox for images */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <VisuallyHidden><DialogTitle>Photo</DialogTitle></VisuallyHidden>
          {lightboxIndex !== null && viewableItems[lightboxIndex] && (
            <div className="relative flex items-center justify-center">
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute -left-14 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <img
                src={viewableItems[lightboxIndex].url}
                alt={viewableItems[lightboxIndex].caption || ''}
                className="max-h-[80vh] rounded-lg object-contain"
              />
              {lightboxIndex < viewableItems.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute -right-14 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute -top-10 right-0 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
              {viewableItems[lightboxIndex].caption && (
                <div className="absolute -bottom-8 text-center text-sm text-white/80">
                  {viewableItems[lightboxIndex].caption}
                </div>
              )}
              <div className="absolute -bottom-8 right-0 text-xs text-white/50">
                {lightboxIndex + 1} / {viewableItems.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
