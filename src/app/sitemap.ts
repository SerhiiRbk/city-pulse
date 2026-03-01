import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const entries: MetadataRoute.Sitemap = [];

  const staticPages = ['', '/events', '/groups', '/calendar', '/city-events'];
  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'hourly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, updated_at')
    .eq('status', 'published')
    .eq('is_private', false)
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (events) {
    for (const event of events) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/events/${event.id}`,
          lastModified: new Date(event.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  const { data: groups } = await supabase
    .from('groups')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (groups) {
    for (const group of groups) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/groups/${group.id}`,
          lastModified: new Date(group.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .eq('is_private', false)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (profiles) {
    for (const profile of profiles) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/profile/${profile.id}`,
          lastModified: new Date(profile.updated_at),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  }

  return entries;
}
