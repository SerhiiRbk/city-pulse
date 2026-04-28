import { getTranslations } from 'next-intl/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@/i18n/navigation';
import { GroupPostMediaGallery } from '@/components/groups/group-post-media-gallery';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { CalendarDays, Megaphone, Newspaper, Users } from 'lucide-react';
import type { FeedPost } from '@/lib/actions/group-posts';
import type { GroupPostType } from '@/types/database';

const POST_TYPE_STYLES: Record<GroupPostType, string> = {
  update: 'bg-primary/10 text-primary border-primary/15',
  announcement: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/15',
  event_recap: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/15',
};

function getPostTypeMeta(type: GroupPostType) {
  if (type === 'announcement') return { Icon: Megaphone };
  if (type === 'event_recap') return { Icon: CalendarDays };
  return { Icon: Newspaper };
}

function formatDate(dateStr: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

interface FeedPostCardProps {
  post: FeedPost;
  locale: string;
}

export async function FeedPostCard({ post, locale }: FeedPostCardProps) {
  const t = await getTranslations('feed');
  const { Icon: TypeIcon } = getPostTypeMeta(post.type);
  const authorName = post.profiles?.display_name || 'User';
  const authorInitials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const groupHref = post.group ? `/groups/${post.group.id}` : '#';
  const postHref = post.group
    ? `/groups/${post.group.id}/posts/${post.slug || post.id}`
    : '#';

  const typeLabel =
    post.type === 'update'
      ? t('typeUpdate')
      : post.type === 'announcement'
        ? t('typeAnnouncement')
        : t('typeRecap');

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 border-b border-border/50 px-5 py-4">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={post.profiles?.avatar_url || undefined} />
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${POST_TYPE_STYLES[post.type]}`}
            >
              <TypeIcon className="h-3.5 w-3.5" />
              {typeLabel}
            </span>
            <time
              className="text-xs text-muted-foreground"
              dateTime={post.published_at}
            >
              {formatDate(post.published_at, locale)}
            </time>
          </div>

          {post.group && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{t('inGroup')}</span>
              <Link href={groupHref} className="font-medium text-foreground hover:underline">
                {post.group.name}
              </Link>
            </div>
          )}

          {post.events && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>{t('linkedEvent')}:</span>
              <Link
                href={`/events/${post.events.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {post.events.title}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <Link href={postHref}>
          <h3 className="text-lg font-semibold text-foreground hover:underline">{post.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          <LinkifiedText text={post.content} />
        </p>

        {post.content.length > 300 && (
          <Link
            href={postHref}
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('openPost')}
          </Link>
        )}

        {post.media && post.media.length > 0 && (
          <div className="mt-4">
            <GroupPostMediaGallery
              images={post.media.map((m) => ({ id: m.id, url: m.url }))}
              title={post.title}
            />
          </div>
        )}
      </div>
    </article>
  );
}
