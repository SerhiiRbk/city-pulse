import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getEvent, getUserAttendance, getEventAttendees, getComments } from '@/lib/actions/events';
import { getUser } from '@/lib/actions/auth';
import { EventActions } from '@/components/events/event-actions';
import { EventComments } from '@/components/events/event-comments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
import { MapPin, Calendar, Clock, Users, Globe, Star, Lock } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import { SITE_NAME } from '@/lib/constants';
import { EventMap } from '@/components/maps/event-map';
import { ReportDialog } from '@/components/reports/report-dialog';
import { EventManagement } from '@/components/events/event-management';
import { EventReviewForm } from '@/components/events/event-review-form';
import { generateEventJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: 'Not Found' };

  return {
    title: `${event.title} | ${SITE_NAME}`,
    description: event.description?.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 160),
      type: 'article',
      images: event.photos?.[0] ? [event.photos[0]] : [],
    },
  };
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
  const { going, favorited } = isAuthenticated
    ? await getUserAttendance(id)
    : { going: false, favorited: false };
  const attendees = await getEventAttendees(id);
  const comments = await getComments(id);

  const spotsLeft = event.max_attendees ? event.max_attendees - (event.going_count || 0) : null;
  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || '';
  const orgInitials = (event.organizer_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const jsonLd = generateEventJsonLd(event);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Photos */}
      {event.photos && event.photos.length > 0 && (
        <div className="mb-6 grid gap-2 overflow-hidden rounded-xl">
          <img
            src={event.photos[0]}
            alt={event.title}
            className="h-64 w-full object-cover sm:h-96"
          />
          {event.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {event.photos.slice(1, 5).map((photo: string, i: number) => (
                <img
                  key={i}
                  src={photo}
                  alt=""
                  className="h-24 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <div>
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
              {event.is_free && <Badge className="bg-green-500 text-white">Free</Badge>}
            </div>
            <h1 className="text-3xl font-bold">{event.title}</h1>

            {event.status === 'cancelled' && (
              <Badge variant="destructive" className="mt-2">Cancelled</Badge>
            )}
            {event.status === 'completed' && (
              <Badge variant="secondary" className="mt-2">Completed</Badge>
            )}
            {event.status === 'draft' && (
              <Badge variant="outline" className="mt-2">Draft</Badge>
            )}
          </div>

          {isOrganizer && (
            <EventManagement eventId={id} status={event.status} />
          )}

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

          <Separator />

          {/* Description */}
          <div>
            <h2 className="mb-2 font-semibold">{t('description')}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {event.description}
            </div>
          </div>

          <Separator />

          {/* Map */}
          {!event.is_online && event.lat && event.lng && (
            <div>
              <h2 className="mb-2 font-semibold">{t('location')}</h2>
              <p className="text-muted-foreground mb-3 text-sm">{event.address}</p>
              <EventMap lat={event.lat} lng={event.lng} />
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
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <EventActions
                eventId={id}
                initialGoing={going}
                initialFavorited={favorited}
                isAuthenticated={isAuthenticated}
              />

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

                {!event.is_online && event.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="text-muted-foreground h-5 w-5 shrink-0" />
                    <p className="text-sm">
                      {event.city}
                      {event.country ? `, ${event.country}` : ''}
                    </p>
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
                    <p className="text-sm">{event.going_count || 0} going</p>
                    {spotsLeft !== null && (
                      <p className="text-muted-foreground text-xs">
                        {spotsLeft > 0 ? `${spotsLeft} spots left` : 'No spots left'}
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
                      {event.avg_rating} ({event.review_count} reviews)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendees */}
          {attendees.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-3 font-semibold">{t('attendees')}</h3>
                <div className="flex flex-wrap gap-2">
                  {attendees.slice(0, 12).map((a: any) => {
                    const name = a.profiles?.display_name || 'User';
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <Avatar key={a.user_id} className="h-8 w-8" title={name}>
                        <AvatarImage src={a.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {attendees.length > 12 && (
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs">
                      +{attendees.length - 12}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
