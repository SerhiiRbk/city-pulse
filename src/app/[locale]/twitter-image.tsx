import { ogImageContentType, ogImageSize, renderDefaultOgImage } from '@/lib/og-image';

export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = 'Localisio — Find your people in the city';

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return renderDefaultOgImage(locale);
}
