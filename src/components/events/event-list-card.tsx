'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Calendar, Users, Globe, Clock } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import { toggleAttendance, toggleFavorite } from '@/lib/actions/events';
import { toast } from 'sonner';
import { useState } from 'react';

interface EventListCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    photos: string[];
    starts_at: string;
    duration_minutes: number;
    city: string | null;
    country: string | null;
    is_online: boolean;
    is_free: boolean;
    price: number | null;
    currency: string | null;
    max_attendees: number | null;
    going_count: number;
    category_slug: string | null;
    category_translations: Record<string, string> | null;
    status: string;
  };
  isGoing?: boolean;
  isFavorited?: boolean;
  isAuthenticated?: boolean;
}

export function EventListCard({ event, isGoing: initialGoing, isFavorited: initialFav, isAuthenticated }: EventListCardProps) {
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const locale = useLocale();
  const [going, setGoing] = useState(initialGoing || false);
  const [favorited, setFavorited] = useState(initialFav || false);
  const [goingCount, setGoingCount] = useState(event.going_count);

  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || event.category_slug || '';

  const isUpcoming = new Date(event.starts_at) > new Date();
  const statusLabel = isUpcoming ? 'Upcoming' : 'Showing';
  const statusColor = isUpcoming
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-green-50 text-green-700 border-green-200';

  async function handleToggleGoing(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    const prev = going;
    setGoing(!prev);
    setGoingCount((c) => (prev ? c - 1 : c + 1));

    const result = await toggleAttendance(event.id);
    if (result.error) {
      setGoing(prev);
      setGoingCount((c) => (prev ? c + 1 : c - 1));
    } else {
      toast.success(result.going ? tDetail('registeredForEvent') : tDetail('cancelledAttendance'));
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    const prev = favorited;
    setFavorited(!prev);

    const result = await toggleFavorite(event.id);
    if (result.error) {
      setFavorited(prev);
    } else {
      toast.success(result.favorited ? tDetail('addedToFavorites') : tDetail('removedFromFavorites'));
    }
  }

  return (
    <Link href={`/events/${event.id}`} className="block">
      <article className="bg-card group overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-lg">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative h-56 shrink-0 overflow-hidden sm:h-auto sm:w-72">
            {event.photos[0] ? (
              <img
                src={event.photos[0]}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="bg-muted flex h-full min-h-[14rem] items-center justify-center">
                <Calendar className="text-muted-foreground h-16 w-16 opacity-30" />
              </div>
            )}
            {/* Price badge */}
            <div className="absolute bottom-3 right-3">
              {event.is_free ? (
                <span className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
                  {t('free')}
                </span>
              ) : (
                <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-gray-900 shadow-lg">
                  {event.price} {event.currency}
                </span>
              )}
            </div>
            {/* Favorite */}
            {isAuthenticated && (
              <button
                onClick={handleToggleFavorite}
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
              >
                <Heart
                  className={`h-4.5 w-4.5 ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
                />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-between p-5">
            <div>
              {/* Category + status row */}
              <div className="mb-2 flex items-center gap-2">
                {categoryLabel && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary rounded-md text-xs font-medium">
                    {categoryLabel}
                  </Badge>
                )}
                {event.is_online && (
                  <Badge variant="secondary" className="rounded-md text-xs">
                    <Globe className="mr-1 h-3 w-3" />
                    Online
                  </Badge>
                )}
              </div>

              {/* Date */}
              <p className="text-primary mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                {formatDate(event.starts_at, locale)}
              </p>

              {/* Title */}
              <h3 className="group-hover:text-primary mb-2 line-clamp-2 text-lg font-bold transition-colors">
                {event.title}
              </h3>

              {/* Description */}
              {event.description && (
                <p className="text-muted-foreground mb-3 line-clamp-2 text-sm leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
                  {statusLabel}
                </span>
                {!event.is_online && (event.city || event.country) && (
                  <span className="text-muted-foreground flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.city}{event.country ? `, ${event.country}` : ''}
                  </span>
                )}
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Users className="h-3.5 w-3.5" />
                  {goingCount}
                </span>
              </div>

              {isAuthenticated && (
                <Button
                  size="sm"
                  variant={going ? 'secondary' : 'default'}
                  className="h-8 px-4 text-xs"
                  onClick={handleToggleGoing}
                >
                  {going ? t('going') : t('join')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
