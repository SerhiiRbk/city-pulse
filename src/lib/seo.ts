import type { Metadata } from 'next';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

function normalizePath(path: string) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildLocalizedUrl(locale: string, path: string) {
  return `${SITE_URL}/${locale}${normalizePath(path)}`;
}

export function buildLocaleAlternates(locale: Locale, path: string): Metadata['alternates'] {
  const normalizedPath = normalizePath(path);

  return {
    canonical: buildLocalizedUrl(locale, normalizedPath),
    languages: Object.fromEntries([
      ...locales.map((value) => [value, buildLocalizedUrl(value, normalizedPath)]),
      ['x-default', buildLocalizedUrl(defaultLocale, normalizedPath)],
    ]),
  };
}

export function buildPageMetadata(input: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /**
   * Per-page social preview image (e.g. event cover). Pass `null`/omit to fall
   * back to the file-based default OG image generated under `[locale]/`.
   */
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  /**
   * When provided, attaches a robots policy to the page metadata. Pass
   * `{ index: false, follow: false }` for personal/dashboard surfaces that
   * shouldn't appear in search results.
   */
  robots?: Metadata['robots'];
}): Metadata {
  const url = buildLocalizedUrl(input.locale, input.path);
  // Only attach `images` when the caller has a real cover photo. If we
  // emit `images: undefined`, Next still treats the field as overridden
  // and skips the file-based default OG image — so we conditionally
  // include the field instead.
  const imageBlock = input.image
    ? {
        images: [
          {
            url: input.image,
            width: 1200,
            height: 630,
            alt: input.title,
          },
        ],
      }
    : {};

  return {
    title: input.title,
    description: input.description,
    alternates: buildLocaleAlternates(input.locale, input.path),
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: input.locale,
      type: input.type || 'website',
      ...imageBlock,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...imageBlock,
    },
    ...(input.robots ? { robots: input.robots } : {}),
  };
}

export function buildNoIndexMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}
