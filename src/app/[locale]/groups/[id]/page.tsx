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
import { getGroupAlbums } from '@/lib/actions/albums';
import { getUserEventStatuses } from '@/lib/actions/events';
import { GroupActions } from '@/components/groups/group-actions';
import { GroupTabs } from '@/components/groups/group-tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Calendar, Pencil, MapPin, CalendarPlus } from 'lucide-react';
import { GroupHeroActions } from '@/components/groups/group-hero-actions';
import { COUNTRIES } from '@/lib/constants';
import { countryCodeToFlag } from '@/lib/utils';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

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

export default async function GroupDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [group, members, upcomingEvents, pastEvents, albums, comments, user, groupInterests] = await Promise.all([
    getGroup(id),
    getGroupMembers(id),
    getGroupEvents(id),
    getPastGroupEvents(id),
    getGroupAlbums(id),
    getGroupComments(id),
    getUser(),
    getGroupInterestsFull(id),
  ]);

  if (!group) notFound();

  const isAuthenticated = !!user;
  const allEventIds = [...upcomingEvents, ...pastEvents].map((e: any) => e.id);
  const [status, canEdit, eventStatuses] = isAuthenticated
    ? await Promise.all([getUserGroupStatus(id), canEditGroup(id), getUserEventStatuses(allEventIds)])
    : [{ isMember: false, isSubscribed: false, role: null }, false, { goingSet: new Set<string>(), favoritedSet: new Set<string>() }];
  const t = await getTranslations('groups');
  const tDetail = await getTranslations('groups.detail');

  return (
    <div className="min-h-screen">
      {/* Hero cover with overlay */}
      <div className="relative h-64 sm:h-80 md:h-96">
        {group.cover_url ? (
          <img src={group.cover_url} alt={group.name} className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary/30 via-primary/10 to-background flex h-full items-center justify-center bg-gradient-to-br">
            <Users className="text-primary/20 h-32 w-32" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />

        {/* Subscribe + Share — top right */}
        <div className="absolute top-4 right-4 z-10">
          <GroupHeroActions
            groupId={id}
            initialSubscribed={status.isSubscribed}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Title overlay — centered */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="text-center text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            {group.name}
          </h1>
        </div>
      </div>

      {/* Main content: left sidebar + tabs + right sidebar */}
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[260px_1fr_260px]">

        {/* LEFT sidebar — About */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            {/* Location */}
            {(group.country || group.city) && (
              <div className="flex items-center gap-2.5 px-5 py-4">
                <MapPin className="text-primary h-4 w-4 shrink-0" />
                <span className="text-sm">
                  {group.country && (() => {
                    const c = COUNTRIES.find((c) => c.code === group.country);
                    return c ? `${countryCodeToFlag(c.code)} ${c[locale as keyof typeof c] || c.en}` : group.country;
                  })()}
                  {group.country && group.city && ', '}
                  {group.city}
                </span>
              </div>
            )}

            {/* Description */}
            {group.description && (
              <div className="px-5 py-4">
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{tDetail('description')}</p>
                <p className="text-foreground mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">
                  {group.description}
                </p>
              </div>
            )}

            {/* Interests */}
            {groupInterests.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-muted-foreground mb-2.5 text-[11px] font-medium uppercase tracking-wider">{tDetail('interests')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupInterests.map((interest: any) => (
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
            albums={albums}
            comments={comments}
            members={members as any}
            canEdit={canEdit}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id}
            goingEventIds={Array.from(eventStatuses.goingSet)}
            favoritedEventIds={Array.from(eventStatuses.favoritedSet)}
          />
        </div>

        {/* RIGHT sidebar — Creator, Stats, Actions */}
        <aside className="order-1 lg:order-3 lg:sticky lg:top-24 lg:self-start">
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
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
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider">{tDetail('creator')}</p>
                  <p className="text-foreground truncate text-sm font-semibold">{group.creator_name}</p>
                </div>
              </Link>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-border/50">
              <div className="flex flex-col items-center bg-card py-3.5">
                <Users className="text-primary mb-1 h-4 w-4" />
                <span className="text-foreground text-sm font-bold">{group.member_count}</span>
                <span className="text-muted-foreground text-[11px]">{tDetail('membersList')}</span>
              </div>
              <div className="flex flex-col items-center bg-card py-3.5">
                <Calendar className="text-primary mb-1 h-4 w-4" />
                <span className="text-foreground text-sm font-bold">{group.event_count}</span>
                <span className="text-muted-foreground text-[11px]">{t('events')}</span>
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
