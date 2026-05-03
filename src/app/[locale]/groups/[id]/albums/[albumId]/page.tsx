import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAlbum, getAlbumItems } from '@/lib/actions/albums';
import { canEditGroup } from '@/lib/actions/groups';
import { AlbumDetailClient } from '@/components/groups/album-detail-client';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

interface Props {
  params: Promise<{ locale: string; id: string; albumId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id, albumId } = await params;
  const album = await getAlbum(albumId);
  if (!album) return {};

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/groups/${id}/albums/${album.id}`,
    title: album.title,
    description: album.description || album.title,
    image: album.cover_url,
  });
}

export default async function AlbumDetailPage({ params }: Props) {
  const { locale, id, albumId } = await params;
  setRequestLocale(locale);

  const [album, items] = await Promise.all([
    getAlbum(albumId),
    getAlbumItems(albumId),
  ]);

  if (!album || album.group_id !== id) notFound();

  const canEdit = await canEditGroup(id);

  return (
    <AlbumDetailClient
      album={album}
      items={items}
      groupId={id}
      canEdit={canEdit}
    />
  );
}
