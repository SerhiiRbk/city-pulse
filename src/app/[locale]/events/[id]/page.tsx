import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getEvent, getUserAttendance, getEventAttendees, getEventRoster, getComments, canEditEvent } from '@/lib/actions/events';
import { recordEventView } from '@/lib/actions/event-funnel';
import { getGroupPostByEventId } from '@/lib/actions/group-posts';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/actions/auth';
import { EventActions } from '@/components/events/event-actions';
import { RsvpVisibilityToggle } from '@/components/events/rsvp-visibility-toggle';
import { ReconfirmBanner } from '@/components/events/reconfirm-banner';
import { SafetyTagBadges } from '@/components/events/safety-tag-badges';
import { SystemEventActions } from '@/components/events/system-event-actions';
import { SystemEventMeetups } from '@/components/events/system-event-meetups';
import { getMeetupCountForSystemEvent } from '@/lib/actions/meetups';
import { EventComments } from '@/components/events/event-comments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
import { MapPin, Calendar, Clock, Users, Globe, Star, Lock, Pencil } from 'lucide-react';
import { formatDate, formatDuration, nowMs } from '@/lib/utils';
import { SITE_NAME, COUNTRIES, LANGUAGES } from '@/lib/constants';
import { EventMap } from '@/components/maps/event-map';
import { ReportDialog } from '@/components/reports/report-dialog';
import { ShareButton } from '@/components/ui/share-button';
import { AddToCalendarButton } from '@/components/events/add-to-calendar';
import { EventManagement } from '@/components/events/event-management';
import { AttendanceRoster, type RosterEntry } from '@/components/events/attendance-roster';
import { EventReviewForm } from '@/components/events/event-review-form';
import { EventPhotoGallery } from '@/components/events/event-photo-gallery';
import { generateEventJsonLd } from '@/lib/json-ld';
import { RichTextView } from '@/components/ui/rich-text-view';
import type { RichTextDoc } from '@/lib/rich-text/types';
import { getFriendsGoing } from '@/lib/actions/friends-going';
import { FriendsGoingCue } from '@/components/events/friends-going-cue';
import { isFeatureEnabled } from '@/lib/feature-flags';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type EventAttendee = Awaited<ReturnType<typeof getEventAttendees>>[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: 'Not Found' };

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/events/${event.id}`,
    title: `${event.title} | ${SITE_NAME}`,
    description: event.description?.slice(0, 160) || event.title,
    image: event.photos?.[0] || null,
    type: 'article',
  });
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('events.detail');
  const tProfile = await getTranslations('profile');
  const tRecurring = await getTranslations('recurring');
  const event = await getEvent(id);

  if (!event) notFound();

  // Fire-and-forget: record a de-duped view in the funnel. The
  // helper swallows errors so analytics flakiness can't break the
  // page render.
  void recordEventView(id);

  const user = await getUser();
  const isAuthenticated = !!user;
  const isOrganizer = user?.id === event.organizer_id;
  const canEdit = isAuthenticated ? await canEditEvent(id) : false;
  const {
    going,
    favorited,
    status: attendanceStatus,
    isVisible: rsvpIsVisible,
    needsReconfirm,
  } = isAuthenticated
    ? await getUserAttendance(id)
    : {
        going: false,
        favorited: false,
        status: 'none' as const,
        isVisible: true,
        needsReconfirm: false,
      };
  const attendees = await getEventAttendees(id);
  const comments = await getComments(id);
  const recap = event.group_id ? await getGroupPostByEventId(id) : null;

  const isSystemEvent = !!event.is_system;
  const spotsLeft = event.max_attendees ? event.max_attendees - (event.going_count || 0) : null;
  const isFull = event.max_attendees != null && (spotsLeft ?? 0) <= 0;
  const waitlistCount = event.waitlist_count ?? 0;
  const interestedCount = event.interested_count ?? 0;
  // For system events we surface a "Going with a group" CTA in the sidebar;
  // the count drives the pill so users can tell at a glance whether
  // someone has already started a meetup.
  const meetupCount = isSystemEvent ? await getMeetupCountForSystemEvent(id) : 0;

  const isPastEvent = new Date(event.starts_at).getTime() < nowMs();
  const canManageAttendance = canEdit && isPastEvent;
  // Friends-going cue (gated by `friends_going` flag).
  const friendsGoing =
    user && (await isFeatureEnabled('friends_going', user.id))
      ? await getFriendsGoing(id, 6)
      : [];
  const roster = canManageAttendance ? await getEventRoster(id) : [];
  const rosterEntries: RosterEntry[] = roster.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      status: row.status as RosterEntry['status'],
      display_name: profile?.display_name || 'User',
      avatar_url: profile?.avatar_url ?? null,
    };
  });
  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || '';
  const orgInitials = (event.organizer_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const cityDisplay = event.city_translations?.[locale] || event.city_name || event.city || '';
  const countryObj = event.country ? COUNTRIES.find((c) => c.code === event.country) : null;
  const countryDisplay = countryObj
    ? (countryObj as Record<string, string>)[locale] || countryObj.en
    : event.country || '';
  const locationLabel = [cityDisplay, countryDisplay].filter(Boolean).join(', ');
  const languageLabels = (event.languages || []).map((code: string) => {
    const language = LANGUAGES.find((item) => item.code === code);
    return language
      ? ((language as Record<string, string>)[locale] || language.en)
      : code;
  });
  const comfortCue = event.going_count >= 12
    ? t('popularCue')
    : event.going_count >= 4
      ? t('soloCue')
      : t('firstCue');
  const easyJoinCopy = `${comfortCue}. ${event.is_online ? t('easyJoinOnline') : t('easyJoinOffline')}`;

  const jsonLd = generateEventJsonLd(event);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 pb-28 sm:py-8 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground sm:mb-5">
        <Link href="/events" className="transition-colors hover:text-foreground">{t('breadcrumbs')}</Link>
        <span>/</span>
        <span className="truncate">{event.title}</span>
      </div>
      {/* Photos */}
      {event.photos && event.photos.length > 0 && (
        <EventPhotoGallery photos={event.photos} title={event.title} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:gap-10 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 sm:space-y-8 lg:col-span-2">
          <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-5 shadow-sm sm:p-6">
            <div className="mb-2 flex flex-wrap gap-2">
              {categoryLabel && <Badge variant="outline">{categoryLabel}</Badge>}
              {event.is_private && (
                <Badge variant="secondary">
                  <Lock className="mr-1 h-3 w-3" />
                  {t('private')}
                </Badge>
              )}
              {event.is_online && (
                <Badge variant="secondary">
                  <Globe className="mr-1 h-3 w-3" />
                  {t('online')}
                </Badge>
              )}
              {event.is_free && <Badge className="bg-success text-success-foreground">{t('free')}</Badge>}
              {isSystemEvent ? (
                <Badge variant="secondary">{t('systemBadge')}</Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{comfortCue}</Badge>
              )}
              {languageLabels.map((language: string) => (
                <Badge key={language} variant="outline">{language}</Badge>
              ))}
              {event.series_id && (
                <Badge variant="secondary" className="bg-primary/5 text-primary">
                  {event.series_position
                    ? `${tRecurring('seriesBadge')} · ${event.series_position}`
                    : tRecurring('seriesBadge')}
                </Badge>
              )}
            </div>
            {event.safety_tags && event.safety_tags.length > 0 && (
              <SafetyTagBadges tags={event.safety_tags} className="mb-3" />
            )}
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>

            {event.status === 'cancelled' && (
              <Badge variant="destructive" className="mt-3">{t('cancelled')}</Badge>
            )}
            {event.status === 'completed' && (
              <Badge variant="secondary" className="mt-3">{t('completed')}</Badge>
            )}
            {event.status === 'draft' && (
              <Badge variant="outline" className="mt-3">{t('draft')}</Badge>
            )}
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={event.organizer_avatar || undefined} />
              <AvatarFallback>{orgInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">{t('organizer')}</p>
              <Link href={`/profile/${event.organizer_id}`} className="font-medium hover:underline">
                {event.organizer_name}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {isSystemEvent ? t('systemEditorialTitle') : t('easyJoinTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSystemEvent ? t('systemEditorialSubtitle') : easyJoinCopy}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {isSystemEvent
                    ? t('interestedCount', { count: interestedCount })
                    : t('goingCount', { count: event.going_count || 0 })}
                </span>
              </div>
            </div>
            {friendsGoing.length > 0 && (
              <FriendsGoingCue friends={friendsGoing} variant="detail" className="mt-3" />
            )}
          </div>

          <Separator />

          {/* Description */}
          {(event.description_json || (event.description && event.description.trim())) && (
            <div>
              <h2 className="mb-2 font-semibold">{t('description')}</h2>
              <RichTextView
                doc={event.description_json as RichTextDoc | null}
                fallbackText={event.description}
                className="text-sm leading-7 text-foreground/90"
              />
            </div>
          )}

          {/*
           * "Идём вместе" — meetup hub. Only rendered for system events;
           * community events already are the meetup, so a recursive shelf
           * here would be confusing.
           */}
          {isSystemEvent && (
            <SystemEventMeetups
              parentEvent={{
                id: event.id,
                title: event.title,
                starts_at: event.starts_at,
                city: event.city,
                address: event.address,
              }}
              isAuthenticated={isAuthenticated}
            />
          )}

          {event.group_id && event.status === 'completed' && (
            <div className="rounded-[2rem] border border-border/50 bg-card shadow-sm">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{t('recapTitle')}</h2>
                  {recap ? (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('recapPublishedHint')}
                      </p>
                      <div className="mt-3">
                        <Link href={`/groups/${event.group_id}/posts/${recap.slug || recap.id}`} className="text-sm font-medium hover:underline">
                          {recap.title}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {canEdit ? t('recapCreateHint') : t('recapPendingHint')}
                    </p>
                  )}
                </div>

                <Button variant={recap ? 'outline' : 'default'} asChild className="rounded-xl">
                  <Link
                    href={
                      recap
                        ? `/groups/${event.group_id}/posts/${recap.slug || recap.id}`
                        : `/groups/${event.group_id}?tab=posts&compose=recap&event=${id}`
                    }
                  >
                    {recap ? t('viewRecap') : t('writeRecap')}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" asChild className="rounded-full shadow-sm">
                <Link href={`/events/${id}/edit`} className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                    {t('editEvent')}
                </Link>
              </Button>
              {isOrganizer && (
                <EventManagement eventId={id} status={event.status} />
              )}
            </div>
          )}

          <Separator />

          {/* Map */}
          {!event.is_online && (event.lat && event.lng || cityDisplay) && (
            <div>
              <h2 className="mb-2 font-semibold">{t('location')}</h2>
              {locationLabel && (
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{locationLabel}</span>
                </div>
              )}
              {event.address && (
                <p className="text-muted-foreground mb-3 text-sm">{event.address}</p>
              )}
              {event.lat && event.lng && (
                <EventMap lat={event.lat} lng={event.lng} />
              )}
            </div>
          )}

          <Separator />

          {/* Comments */}
          <EventComments
            eventId={id}
            initialComments={comments}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id}
            canModerate={canEdit}
          />

          {canManageAttendance && (
            <AttendanceRoster eventId={id} initialEntries={rosterEntries} />
          )}

          {event.status === 'completed' && isAuthenticated && going && !isSystemEvent && (
            <EventReviewForm eventId={id} />
          )}

          {isAuthenticated && (
            <div className="flex justify-end">
              <ReportDialog targetType="event" targetId={id} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="space-y-5 pt-5 sm:space-y-6 sm:pt-6">
              {isSystemEvent ? (
                /*
                 * System events (Афиша) don't carry RSVP — render a tailored
                 * action bar (Save to calendar / Interested / Favorite / Share).
                 * The "Going with a group" CTA will be wired in Block B4 once
                 * the meetup model migration lands.
                 */
                <SystemEventActions
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    address: event.address,
                    city: event.city,
                    starts_at: event.starts_at,
                    duration_minutes: event.duration_minutes,
                    is_online: event.is_online,
                  }}
                  initialStatus={attendanceStatus}
                  initialFavorited={favorited}
                  isAuthenticated={isAuthenticated}
                  meetupCta={{
                    label: t(meetupCount > 0 ? 'goWithGroupExisting' : 'goWithGroupNew'),
                    href: '#meetups',
                    count: meetupCount,
                  }}
                />
              ) : (
                <>
                  <EventActions
                    eventId={id}
                    initialStatus={attendanceStatus}
                    initialFavorited={favorited}
                    isAuthenticated={isAuthenticated}
                    isFull={isFull}
                  />
                  {isAuthenticated && (attendanceStatus === 'going' || attendanceStatus === 'waitlist') && (
                    <RsvpVisibilityToggle
                      eventId={id}
                      initialIsVisible={rsvpIsVisible}
                    />
                  )}
                  {isAuthenticated && needsReconfirm && (
                    <ReconfirmBanner eventId={id} initiallyOpen />
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ShareButton title={event.title} className="flex-1 rounded-xl" />
                    <AddToCalendarButton
                      event={{
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        address: event.address,
                        city: event.city,
                        starts_at: event.starts_at,
                        duration_minutes: event.duration_minutes,
                        is_online: event.is_online,
                      }}
                      className="flex-1 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="text-muted-foreground h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{formatDate(event.starts_at, locale)}</p>
                    <p className="text-muted-foreground text-xs">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {formatDuration(event.duration_minutes)}
                    </p>
                  </div>
                </div>

                {!event.is_online && locationLabel && (
                  <div className="flex items-center gap-3">
                    <MapPin className="text-muted-foreground h-5 w-5 shrink-0" />
                    <p className="text-sm">{locationLabel}</p>
                  </div>
                )}

                {event.is_online && (
                  <div className="flex items-center gap-3">
                    <Globe className="text-muted-foreground h-5 w-5 shrink-0" />
                    <p className="text-sm">{t('online')}</p>
                  </div>
                )}

                {languageLabels.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Globe className="text-muted-foreground h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{tProfile('languages')}</p>
                      <p className="text-muted-foreground text-xs">
                        {languageLabels.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="text-muted-foreground h-5 w-5 shrink-0" />
                  <div>
                    {/*
                     * Counter for community events shows "X going" + spots/waitlist;
                     * system events have no attendance ownership, so we surface the
                     * "interested" count as the headline number instead.
                     */}
                    {isSystemEvent ? (
                      <p className="text-sm">{t('interestedCount', { count: interestedCount })}</p>
                    ) : (
                      <>
                        <p className="text-sm">{t('goingCount', { count: event.going_count || 0 })}</p>
                        {spotsLeft !== null && (
                          <p className="text-muted-foreground text-xs">
                            {spotsLeft > 0 ? t('spotsLeft', { count: spotsLeft }) : t('noSpotsLeft')}
                          </p>
                        )}
                        {waitlistCount > 0 && (
                          <p className="text-muted-foreground text-xs">
                            {t('waitlistCount', { count: waitlistCount })}
                          </p>
                        )}
                        {interestedCount > 0 && (
                          <p className="text-muted-foreground text-xs">
                            {t('interestedCount', { count: interestedCount })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!event.is_free && event.price && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-5 text-center text-lg font-bold">€</span>
                    <p className="text-sm">
                      {event.price} {event.currency}
                    </p>
                  </div>
                )}

                {event.avg_rating > 0 && (
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <p className="text-sm">
                      {t('reviewsCount', { rating: event.avg_rating, count: event.review_count })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendees */}
          {attendees.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="mb-3 font-semibold">{t('attendees')}</h3>
                <div className="flex flex-wrap gap-2">
                  {attendees.slice(0, 12).map((a: EventAttendee) => {
                    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                    const name = profile?.display_name || 'User';
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <Avatar key={a.user_id} className="h-8 w-8" title={name}>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {attendees.length > 12 && (
                    <p className="mt-2 w-full text-xs text-muted-foreground">
                      {t('moreAttendees', { count: attendees.length - 12 })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-2xl backdrop-blur-md lg:hidden">
        <div className="container mx-auto flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{event.title}</p>
            <p className="text-xs text-muted-foreground">{formatDate(event.starts_at, locale)}</p>
          </div>
          <EventActions
            eventId={id}
            initialStatus={attendanceStatus}
            initialFavorited={favorited}
            isAuthenticated={isAuthenticated}
            isFull={isFull}
            compact
          />
        </div>
      </div>
    </div>
  );
}
