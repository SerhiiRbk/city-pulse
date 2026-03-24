import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/actions/auth';
import { getFeedPosts, type FeedPost } from '@/lib/actions/group-posts';
import { FeedPostCard } from '@/components/feed/feed-post-card';
import { FeedFilters } from '@/components/feed/feed-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Newspaper, Compass } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'feed' });

  return buildPageMetadata({
    locale,
    path: '/feed',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const t = await getTranslations('feed');
  const user = await getUser();
  const isAuthenticated = !!user;

  const tab = filters.tab === 'my' && isAuthenticated ? 'my' : 'discover';

  const feedOptions = {
    myGroups: tab === 'my',
    country: filters.country,
    city: filters.city,
    language: filters.language,
    type: filters.type,
    limit: 30,
  };

  const posts = await getFeedPosts(feedOptions);

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-muted/50 to-background px-4 pb-8 pt-12">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-base">{t('subtitle')}</p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Tabs defaultValue={tab} className="space-y-6">
          {isAuthenticated && (
            <TabsList variant="line" className="h-auto w-full justify-start gap-1 rounded-2xl border border-border/50 bg-card p-1 shadow-sm">
              <TabsTrigger value="my" className="h-11 gap-1.5 px-4 py-2.5" asChild>
                <a href={`?tab=my${buildFilterQs(filters)}`}>
                  <Newspaper className="h-4 w-4" />
                  <span className="text-sm">{t('myFeed')}</span>
                </a>
              </TabsTrigger>
              <TabsTrigger value="discover" className="h-11 gap-1.5 px-4 py-2.5" asChild>
                <a href={`?tab=discover${buildFilterQs(filters)}`}>
                  <Compass className="h-4 w-4" />
                  <span className="text-sm">{t('discover')}</span>
                </a>
              </TabsTrigger>
            </TabsList>
          )}

          <FeedFilters
            currentFilters={filters}
            locale={locale}
          />

          <TabsContent value={tab} className="mt-0 space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
                <EmptyState
                  icon="messages"
                  title={t('empty')}
                  description={tab === 'my' ? t('emptyMyFeed') : t('emptyDiscover')}
                  className="py-10"
                />
              </div>
            ) : (
              posts.map((post: FeedPost) => (
                <FeedPostCard key={post.id} post={post} locale={locale} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function buildFilterQs(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (filters.country) params.set('country', filters.country);
  if (filters.city) params.set('city', filters.city);
  if (filters.language) params.set('language', filters.language);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `&${qs}` : '';
}
