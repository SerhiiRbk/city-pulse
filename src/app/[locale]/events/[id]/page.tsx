import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getEvent, getUserAttendance, getEventAttendees, getComments, canEditEvent } from '@/lib/actions/events';
import { getGroupPostByEventId } from '@/lib/actions/group-posts';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/actions/auth';
import { EventActions } from '@/components/events/event-actions';
import { EventComments } from '@/components/events/event-comments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
import { MapPin, Calendar, Clock, Users, Globe, Star, Lock, Pencil } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import { SITE_NAME, COUNTRIES } from '@/lib/constants';
import { EventMap } from '@/components/maps/event-map';
import { ReportDialog } from '@/components/reports/report-dialog';
import { ShareButton } from '@/components/ui/share-button';
import { EventManagement } from '@/components/events/event-management';
import { EventReviewForm } from '@/components/events/event-review-form';
import { EventPhotoGallery } from '@/components/events/event-photo-gallery';
import { generateEventJsonLd } from '@/lib/json-ld';
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
  const event = await getEvent(id);

  if (!event) notFound();

  const user = await getUser();
  const isAuthenticated = !!user;
  const isOrganizer = user?.id === event.organizer_id;
  const canEdit = isAuthenticated ? await canEditEvent(id) : false;
  const { going, favorited } = isAuthenticated
    ? await getUserAttendance(id)
    : { going: false, favorited: false };
  const attendees = await getEventAttendees(id);
  const comments = await getComments(id);
  const recap = event.group_id ? await getGroupPostByEventId(id) : null;

  const spotsLeft = event.max_attendees ? event.max_attendees - (event.going_count || 0) : null;
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
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{comfortCue}</Badge>
            </div>
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
                <p className="text-sm font-semibold">{t('easyJoinTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{easyJoinCopy}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{t('goingCount', { count: event.going_count || 0 })}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="mb-2 font-semibold">{t('description')}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {event.description}
            </div>
          </div>

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
          />

          {event.status === 'completed' && isAuthenticated && going && (
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
              <EventActions
                eventId={id}
                initialGoing={going}
                initialFavorited={favorited}
                isAuthenticated={isAuthenticated}
              />
              <ShareButton title={event.title} className="w-full rounded-xl" />

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

                <div className="flex items-center gap-3">
                  <Users className="text-muted-foreground h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm">{t('goingCount', { count: event.going_count || 0 })}</p>
                    {spotsLeft !== null && (
                      <p className="text-muted-foreground text-xs">
                        {spotsLeft > 0 ? t('spotsLeft', { count: spotsLeft }) : t('noSpotsLeft')}
                      </p>
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
            initialGoing={going}
            initialFavorited={favorited}
            isAuthenticated={isAuthenticated}
            compact
          />
        </div>
      </div>
    </div>
  );
}
