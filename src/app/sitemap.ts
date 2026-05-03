import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale, locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';

type SitemapEntry = MetadataRoute.Sitemap[number];

/** Build hreflang alternates for a path. Canonical entry uses the default locale. */
function localeAlternates(path: string): NonNullable<SitemapEntry['alternates']> {
  return {
    languages: Object.fromEntries([
      ...locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
      ['x-default', `${SITE_URL}/${defaultLocale}${path}`],
    ]),
  };
}

/**
 * Push one sitemap entry per locale, all sharing the same hreflang alternates
 * block so Google can group locale variants of the same logical URL.
 */
function pushLocalized(
  entries: SitemapEntry[],
  path: string,
  meta: Pick<SitemapEntry, 'lastModified' | 'changeFrequency' | 'priority'>,
) {
  const alternates = localeAlternates(path);
  for (const locale of locales) {
    entries.push({
      url: `${SITE_URL}/${locale}${path}`,
      ...meta,
      alternates,
    });
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const entries: SitemapEntry[] = [];
  // Single timestamp for static-content URLs so a fresh build doesn't
  // claim every static page changed at "now". Search engines rely on
  // `lastmod` to throttle recrawls; constant churn signals are noisy.
  const buildTimestamp = new Date();

  const staticPages: { path: string; meta: Omit<SitemapEntry, 'url' | 'alternates'> }[] = [
    { path: '', meta: { lastModified: buildTimestamp, changeFrequency: 'daily', priority: 1.0 } },
    { path: '/events', meta: { lastModified: buildTimestamp, changeFrequency: 'hourly', priority: 0.9 } },
    { path: '/events/map', meta: { lastModified: buildTimestamp, changeFrequency: 'hourly', priority: 0.7 } },
    { path: '/groups', meta: { lastModified: buildTimestamp, changeFrequency: 'hourly', priority: 0.8 } },
    { path: '/calendar', meta: { lastModified: buildTimestamp, changeFrequency: 'hourly', priority: 0.6 } },
    { path: '/city-events', meta: { lastModified: buildTimestamp, changeFrequency: 'hourly', priority: 0.8 } },
    { path: '/terms', meta: { lastModified: buildTimestamp, changeFrequency: 'yearly', priority: 0.2 } },
    { path: '/privacy', meta: { lastModified: buildTimestamp, changeFrequency: 'yearly', priority: 0.2 } },
  ];
  for (const { path, meta } of staticPages) {
    pushLocalized(entries, path, meta);
  }

  const { data: events } = await supabase
    .from('events_with_counts')
    .select('id, updated_at')
    .eq('status', 'published')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (events) {
    for (const event of events) {
      pushLocalized(entries, `/events/${event.id}`, {
        lastModified: new Date(event.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  const { data: groups } = await supabase
    .from('groups_with_counts')
    .select('id, updated_at')
    .eq('is_blocked', false)
    .eq('creator_is_blocked', false)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (groups) {
    for (const group of groups) {
      pushLocalized(entries, `/groups/${group.id}`, {
        lastModified: new Date(group.updated_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  const visibleGroupIds = new Set((groups || []).map((group) => group.id));

  const { data: posts } = await supabase
    .from('group_posts')
    .select('id, group_id, slug, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (posts) {
    for (const post of posts) {
      if (!visibleGroupIds.has(post.group_id)) continue;
      const postPath = post.slug || post.id;
      pushLocalized(entries, `/groups/${post.group_id}/posts/${postPath}`, {
        lastModified: new Date(post.updated_at),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .eq('is_private', false)
    .eq('is_blocked', false)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (profiles) {
    for (const profile of profiles) {
      pushLocalized(entries, `/profile/${profile.id}`, {
        lastModified: new Date(profile.updated_at),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
