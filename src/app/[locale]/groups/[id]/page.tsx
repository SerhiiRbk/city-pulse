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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        {/* Title overlay on cover */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
              {group.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {t('members', { count: group.member_count })}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {group.event_count} {t('events').toLowerCase()}
              </span>
              {(group.country || group.city) && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {group.country && (() => {
                      const c = COUNTRIES.find((c) => c.code === group.country);
                      return c ? `${countryCodeToFlag(c.code)} ${c[locale as keyof typeof c] || c.en}` : group.country;
                    })()}
                    {group.country && group.city && ', '}
                    {group.city}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info card — overlaps cover */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="bg-background relative -mt-8 rounded-3xl border border-border/50 p-6 shadow-xl sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Creator + description */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              {group.creator_name && (
                <Link
                  href={`/profile/${group.created_by}`}
                  className="text-muted-foreground mb-3 inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={group.creator_avatar || undefined} />
                    <AvatarFallback className="text-[10px]">{group.creator_name[0]}</AvatarFallback>
                  </Avatar>
                  {tDetail('creator')}: <span className="text-foreground font-medium">{group.creator_name}</span>
                </Link>
              )}
              {group.description && (
                <p className="text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {group.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
              <GroupActions
                groupId={id}
                isMember={status.isMember}
                isSubscribed={status.isSubscribed}
                role={status.role}
                isAuthenticated={isAuthenticated}
              />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" asChild className="rounded-full shadow-sm">
                    <Link href={`/events/create?group_id=${id}`}>
                      <CalendarPlus className="mr-1.5 h-4 w-4" />
                      {tDetail('createEvent')}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="rounded-full shadow-sm">
                    <Link href={`/groups/${id}/edit`}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      {tDetail('editGroup')}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Interests */}
          {groupInterests.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2 border-t pt-5 sm:justify-start">
              {groupInterests.map((interest: any) => (
                <span
                  key={interest.id}
                  className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {interest.icon && <span className="text-sm leading-none">{interest.icon}</span>}
                  {interest.translations?.[locale] || interest.translations?.en || interest.slug}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs — full container width */}
      <div className="container mx-auto px-4 pb-12 pt-6">
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
    </div>
  );
}
