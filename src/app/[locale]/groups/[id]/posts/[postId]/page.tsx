import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { canEditGroup, getGroup } from '@/lib/actions/groups';
import { getGroupPostComments, getGroupPostInGroup } from '@/lib/actions/group-posts';
import { GroupPostMediaGallery } from '@/components/groups/group-post-media-gallery';
import { GroupPostComments } from '@/components/groups/group-post-comments';
import { RichTextView } from '@/components/ui/rich-text-view';
import type { RichTextDoc } from '@/lib/rich-text/types';
import { ShareButton } from '@/components/ui/share-button';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Link2, Megaphone, Newspaper, Pencil } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';
import { generateArticleJsonLd, generateBreadcrumbJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

interface Props {
  params: Promise<{ locale: string; id: string; postId: string }>;
}

const POST_BADGE_STYLES = {
  update: 'bg-primary/10 text-primary hover:bg-primary/10',
  announcement: 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300',
  event_recap: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300',
} as const;

function getPostMeta(type: 'update' | 'announcement' | 'event_recap', t: Awaited<ReturnType<typeof getTranslations>>) {
  if (type === 'announcement') {
    return { label: t('postTypeAnnouncement'), Icon: Megaphone };
  }
  if (type === 'event_recap') {
    return { label: t('postTypeRecap'), Icon: CalendarDays };
  }
  return { label: t('postTypeUpdate'), Icon: Newspaper };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, postId } = await params;
  const { id } = await params;
  const post = await getGroupPostInGroup(id, postId);
  if (!post) return { title: 'Not Found' };
  const postPath = post.slug || post.id;

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/groups/${post.group_id}/posts/${postPath}`,
    title: post.title,
    description: post.content?.slice(0, 160) || post.title,
    image: post.media?.[0]?.url || null,
    type: 'article',
  });
}

export default async function GroupPostDetailPage({ params }: Props) {
  const { locale, id, postId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('groups.detail');
  const [group, post, user] = await Promise.all([
    getGroup(id),
    getGroupPostInGroup(id, postId),
    getUser(),
  ]);

  if (!group || !post || post.group_id !== id) notFound();

  if (post.slug && post.slug !== postId) {
    permanentRedirect(`/${locale}/groups/${id}/posts/${post.slug}`);
  }

  const comments = await getGroupPostComments(post.id);

  const isAuthenticated = !!user;
  const canEdit = isAuthenticated ? await canEditGroup(id) : false;
  const postMeta = getPostMeta(post.type, t);
  const authorName = post.profiles?.display_name || 'User';
  const authorInitials = authorName.split(' ').map((chunk) => chunk[0]).join('').toUpperCase().slice(0, 2);
  const postPath = post.slug || post.id;
  const pagePath = `/${locale}/groups/${id}/posts/${postPath}`;
  const jsonLd = generateArticleJsonLd({
    id: post.id,
    title: post.title,
    content: post.content,
    published_at: post.published_at,
    updated_at: post.updated_at,
    image: post.media?.[0]?.url || null,
    author_name: authorName,
    localePath: pagePath,
  });
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('breadcrumbs'), url: `/${locale}/groups` },
    { name: group.name, url: `/${locale}/groups/${id}` },
    { name: post.title, url: pagePath },
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 pb-28 sm:py-8 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground sm:mb-5">
        <Link href="/groups" className="transition-colors hover:text-foreground">{t('breadcrumbs')}</Link>
        <span>/</span>
        <Link href={`/groups/${id}`} className="truncate transition-colors hover:text-foreground">{group.name}</Link>
        <span>/</span>
        <span className="truncate">{post.title}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-3 lg:gap-10">
        <div className="space-y-6 sm:space-y-8 lg:col-span-2">
          <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={POST_BADGE_STYLES[post.type]}>
                <postMeta.Icon className="mr-1 h-3.5 w-3.5" />
                {postMeta.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(post.published_at).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {post.content.slice(0, 180)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">{t('creator')}</p>
              {post.profiles ? (
                <Link href={`/profile/${post.profiles.id}`} className="font-medium hover:underline">
                  {authorName}
                </Link>
              ) : (
                <p className="font-medium">{authorName}</p>
              )}
            </div>
          </div>

          {post.events && (
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-semibold">{t('linkedEvent')}</p>
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/events/${post.events.id}`} className="font-medium text-foreground hover:underline">
                    {post.events.title}
                  </Link>
                  <p className="mt-1">
                    {new Date(post.events.starts_at).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-xl">
                  <Link href={`/events/${post.events.id}`}>{t('viewLinkedEvent')}</Link>
                </Button>
              </div>
            </div>
          )}

          {post.media.length > 0 && (
            <GroupPostMediaGallery
              images={post.media.map((image) => ({ id: image.id, url: image.url }))}
              title={post.title}
            />
          )}

          <div className="rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('postBodyTitle')}</h2>
            <RichTextView
              doc={post.content_json as RichTextDoc | null}
              fallbackText={post.content}
            />
          </div>

          <div className="rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm sm:p-6">
            <GroupPostComments
              postId={post.id}
              initialComments={comments}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              canModerate={canEdit}
            />
          </div>
        </div>

        <aside className="space-y-4 sm:space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm">
            <div className="space-y-3">
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href={`/groups/${id}`}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {t('backToGroup')}
                </Link>
              </Button>
              <ShareButton
                title={post.title}
                url={`${SITE_URL}${pagePath}`}
                className="w-full rounded-xl"
              />
              {canEdit && (
                <Button variant="ghost" className="w-full rounded-xl" asChild>
                  <Link href={`/groups/${id}?tab=posts`}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    {t('editInGroupFeed')}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('communityVibe')}</p>
            <p className="mt-2 text-sm text-foreground">{group.name}</p>
            {group.slug && (
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-all">
                  {SITE_URL}{pagePath}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
