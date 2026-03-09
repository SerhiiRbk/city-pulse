import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import {
  getGroup,
  getGroupMembers,
  getGroupEvents,
  getPastGroupEvents,
  getGroupComments,
  getUserGroupStatus,
  canEditGroup,
  getGroupInterestsFull,
} from '@/lib/actions/groups';
import { getGroupGalleryImages, getGroupPosts } from '@/lib/actions/group-posts';
import { getGroupAlbums } from '@/lib/actions/albums';
import { getUserEventStatuses } from '@/lib/actions/events';
import { GroupActions } from '@/components/groups/group-actions';
import { GroupTabs } from '@/components/groups/group-tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Calendar, Pencil, MapPin, CalendarPlus, Link2 } from 'lucide-react';
import { GroupHeroActions } from '@/components/groups/group-hero-actions';
import { COUNTRIES } from '@/lib/constants';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ tab?: string; compose?: string; event?: string }>;
}

type GroupEvent = Awaited<ReturnType<typeof getGroupEvents>>[number];
type GroupInterest = Awaited<ReturnType<typeof getGroupInterestsFull>>[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) return {};
  return {
    title: `${group.name} — City-Pulse`,
    description: group.description?.slice(0, 160),
    openGraph: {
      title: group.name,
      description: group.description?.slice(0, 160),
      images: group.cover_url ? [{ url: group.cover_url }] : undefined,
    },
  };
}

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  setRequestLocale(locale);

  const [group, members, upcomingEvents, pastEvents, posts, albums, comments, user, groupInterests] = await Promise.all([
    getGroup(id),
    getGroupMembers(id),
    getGroupEvents(id),
    getPastGroupEvents(id),
    getGroupPosts(id),
    getGroupAlbums(id),
    getGroupComments(id),
    getUser(),
    getGroupInterestsFull(id),
  ]);

  if (!group) notFound();

  const isAuthenticated = !!user;
  const allEventIds = [...upcomingEvents, ...pastEvents].map((event: GroupEvent) => event.id);
  const [status, canEdit, eventStatuses] = isAuthenticated
    ? await Promise.all([getUserGroupStatus(id), canEditGroup(id), getUserEventStatuses(allEventIds)])
    : [{ isMember: false, isSubscribed: false, role: null }, false, { goingSet: new Set<string>(), favoritedSet: new Set<string>() }];
  const groupGalleryImages = canEdit ? await getGroupGalleryImages(id) : [];
  const t = await getTranslations('groups');
  const tDetail = await getTranslations('groups.detail');
  const communityCue = group.member_count > 50
    ? tDetail('communityCueEstablished')
    : group.event_count > 2
      ? tDetail('communityCueActive')
      : tDetail('communityCueStarter');
  const countryDisplay = group.country
    ? (() => {
      const c = COUNTRIES.find((co) => co.code === group.country);
      return c ? ((c as Record<string, string>)[locale] || c.en) : group.country;
    })()
    : null;
  const locationLabel = [group.city, countryDisplay].filter(Boolean).join(', ');
  const allowedTabs = new Set(['upcoming', 'past', 'photos', 'posts', 'members', 'comments']);
  const initialTab = allowedTabs.has(resolvedSearchParams?.tab || '') ? resolvedSearchParams?.tab : 'upcoming';
  const initialRecapEventId = resolvedSearchParams?.compose === 'recap' ? resolvedSearchParams?.event : undefined;

  return (
    <div className="min-h-screen">
      <div className="relative h-56 sm:h-72 md:h-96">
        {group.cover_url ? (
          <img src={group.cover_url} alt={group.name} className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary/30 via-primary/10 to-background flex h-full items-center justify-center bg-gradient-to-br">
            <Users className="text-primary/20 h-32 w-32" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />

        {/* Subscribe + Share — top right */}
        <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
          <GroupHeroActions
            groupId={id}
            initialSubscribed={status.isSubscribed}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 sm:pb-8">
          <div className="container mx-auto">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:mb-4 sm:text-sm">
                <Users className="h-4 w-4" />
                {tDetail('communityVibe')}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
                {group.name}
              </h1>
              <p className="mt-2.5 max-w-2xl text-sm text-white/80 sm:mt-3 sm:text-base">
                {communityCue}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:text-sm">
                  {t('members', { count: group.member_count })}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:text-sm">
                  {tDetail('eventsCount', { count: group.event_count })}
                </span>
                {locationLabel && (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:text-sm">
                    {locationLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 sm:py-8 lg:grid-cols-[260px_1fr_260px]">
        <div className="order-0 col-span-full flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/groups" className="transition-colors hover:text-foreground">{tDetail('breadcrumbs')}</Link>
          <span>/</span>
          <span className="truncate">{group.name}</span>
        </div>

        {/* LEFT sidebar — About */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            <div className="bg-primary/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{tDetail('communityVibe')}</p>
              <p className="mt-2 text-sm text-foreground">{communityCue}</p>
            </div>
            {locationLabel && (
              <div className="flex items-center gap-2.5 px-5 py-4">
                <MapPin className="text-primary h-4 w-4 shrink-0" />
                <span className="text-sm">{locationLabel}</span>
              </div>
            )}

            {group.slug && (
              <div className="flex items-center gap-2.5 px-5 py-3">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{tDetail('directLink')}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    /groups/{group.country ? group.country.toLowerCase() : 'global'}/{group.slug}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {group.description && (
              <div className="px-5 py-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{tDetail('description')}</p>
                <p className="text-foreground mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {group.description}
                </p>
              </div>
            )}

            {/* Interests */}
            {groupInterests.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-muted-foreground mb-2.5 text-xs font-medium uppercase tracking-wider">{tDetail('interests')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupInterests.map((interest: GroupInterest) => (
                    <span
                      key={interest.id}
                      className="bg-primary/5 text-primary inline-flex items-center gap-1 rounded-full border border-primary/10 px-2.5 py-1 text-[11px] font-medium"
                    >
                      {interest.icon && <span className="text-xs leading-none">{interest.icon}</span>}
                      {interest.translations?.[locale] || interest.translations?.en || interest.slug}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER — Tabs */}
        <div className="order-3 min-w-0 lg:order-2">
          <GroupTabs
            groupId={id}
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            posts={posts}
            groupGalleryImages={groupGalleryImages}
            albums={albums}
            comments={comments}
            members={members}
            canEdit={canEdit}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id}
            goingEventIds={Array.from(eventStatuses.goingSet)}
            favoritedEventIds={Array.from(eventStatuses.favoritedSet)}
            initialTab={initialTab}
            initialRecapEventId={initialRecapEventId}
          />
        </div>

        {/* RIGHT sidebar — Creator, Stats, Actions */}
        <aside className="order-1 lg:order-3 lg:sticky lg:top-24 lg:self-start">
          <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            {/* Creator */}
            {group.creator_name && (
              <Link
                href={`/profile/${group.created_by}`}
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarImage src={group.creator_avatar || undefined} />
                  <AvatarFallback className="text-xs font-semibold">{group.creator_name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">{tDetail('creator')}</p>
                  <p className="text-foreground truncate text-sm font-semibold">{group.creator_name}</p>
                </div>
              </Link>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-border/50">
              <div className="flex flex-col items-center bg-card py-3.5">
                <Users className="text-primary mb-1 h-4 w-4" />
                <span className="text-foreground text-sm font-bold">{group.member_count}</span>
                <span className="text-muted-foreground text-xs">{tDetail('membersList')}</span>
              </div>
              <div className="flex flex-col items-center bg-card py-3.5">
                <Calendar className="text-primary mb-1 h-4 w-4" />
                <span className="text-foreground text-sm font-bold">{group.event_count}</span>
                <span className="text-muted-foreground text-xs">{tDetail('eventsLabel')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 px-5 py-4">
              <GroupActions
                groupId={id}
                isMember={status.isMember}
                isSubscribed={status.isSubscribed}
                role={status.role}
                isAuthenticated={isAuthenticated}
              />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" asChild className="w-full rounded-xl">
                    <Link href={`/events/create?group_id=${id}`}>
                      <CalendarPlus className="mr-1.5 h-4 w-4" />
                      {tDetail('createEvent')}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full rounded-xl">
                    <Link href={`/groups/${id}/edit`}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      {tDetail('editGroup')}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
