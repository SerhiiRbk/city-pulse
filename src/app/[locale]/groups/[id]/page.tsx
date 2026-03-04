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
import { GroupActions } from '@/components/groups/group-actions';
import { GroupTabs } from '@/components/groups/group-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [status, canEdit] = isAuthenticated
    ? await Promise.all([getUserGroupStatus(id), canEditGroup(id)])
    : [{ isMember: false, isSubscribed: false, role: null }, false];
  const t = await getTranslations('groups');
  const tDetail = await getTranslations('groups.detail');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cover */}
      <div className="relative mb-6 h-48 overflow-hidden rounded-xl sm:h-64">
        {group.cover_url ? (
          <img src={group.cover_url} alt={group.name} className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary/20 to-primary/5 flex h-full items-center justify-center bg-gradient-to-br">
            <Users className="text-primary/30 h-24 w-24" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          <h1 className="mb-2 text-3xl font-bold">{group.name}</h1>

          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t('members', { count: group.member_count })}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {group.event_count} {t('events').toLowerCase()}
            </span>
            {(group.country || group.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {group.country && (() => {
                  const c = COUNTRIES.find((c) => c.code === group.country);
                  return c ? `${countryCodeToFlag(c.code)} ${c[locale as keyof typeof c] || c.en}` : group.country;
                })()}
                {group.country && group.city && ', '}
                {group.city}
              </span>
            )}
          </div>

          {groupInterests.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {groupInterests.map((interest: any) => (
                <span
                  key={interest.id}
                  className="bg-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm shadow-sm"
                >
                  {interest.icon && <span className="text-base leading-none">{interest.icon}</span>}
                  {interest.translations?.[locale] || interest.translations?.en || interest.slug}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <GroupActions
              groupId={id}
              isMember={status.isMember}
              isSubscribed={status.isSubscribed}
              role={status.role}
              isAuthenticated={isAuthenticated}
            />
            {canEdit && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/events/create?group_id=${id}`}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    {tDetail('createEvent')}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/groups/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {tDetail('editGroup')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {group.description && (
            <div className="mt-6">
              <p className="text-muted-foreground whitespace-pre-wrap">{group.description}</p>
            </div>
          )}

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
          />
        </div>

        {/* Sidebar */}
        <div>
          {/* Creator */}
          {group.creator_name && (
            <div className="mb-6">
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">{tDetail('creator')}</h3>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={group.creator_avatar || undefined} />
                  <AvatarFallback>{group.creator_name[0]}</AvatarFallback>
                </Avatar>
                <Link href={`/profile/${group.created_by}`} className="text-sm font-medium hover:underline">
                  {group.creator_name}
                </Link>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-muted-foreground mb-3 text-sm font-medium">
              {tDetail('membersList')} ({members.length})
            </h3>
            <div className="space-y-2">
              {members.slice(0, 20).map((m: { user_id: string; role: string; profiles: { id: string; display_name: string; avatar_url: string | null } }) => (
                <Link
                  key={m.user_id}
                  href={`/profile/${m.user_id}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{m.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.profiles?.display_name}</span>
                  {m.role === 'admin' && (
                    <Badge variant="secondary" className="ml-auto text-xs">{tDetail('admin')}</Badge>
                  )}
                  {m.role === 'moderator' && (
                    <Badge variant="outline" className="ml-auto text-xs">{tDetail('moderator')}</Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
