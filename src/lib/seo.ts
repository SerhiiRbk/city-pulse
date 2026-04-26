import type { Metadata } from 'next';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';

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

  return {
    title: input.title,
    description: input.description,
    alternates: buildLocaleAlternates(input.locale, input.path),
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: input.type || 'website',
      images: input.image ? [{ url: input.image }] : undefined,
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
