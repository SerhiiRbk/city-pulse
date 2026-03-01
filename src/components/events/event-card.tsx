'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Calendar, Users, Globe } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toggleAttendance, toggleFavorite } from '@/lib/actions/events';
import { toast } from 'sonner';
import { useState } from 'react';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    photos: string[];
    starts_at: string;
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
  };
  isGoing?: boolean;
  isFavorited?: boolean;
  isAuthenticated?: boolean;
}

export function EventCard({ event, isGoing: initialGoing, isFavorited: initialFav, isAuthenticated }: EventCardProps) {
  const t = useTranslations('events.card');
  const tDetail = useTranslations('events.detail');
  const locale = useLocale();
  const [going, setGoing] = useState(initialGoing || false);
  const [favorited, setFavorited] = useState(initialFav || false);
  const [goingCount, setGoingCount] = useState(event.going_count);

  const spotsLeft = event.max_attendees ? event.max_attendees - goingCount : null;
  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || event.category_slug || '';

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
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative h-48 overflow-hidden">
          {event.photos[0] ? (
            <img
              src={event.photos[0]}
              alt={event.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="bg-muted flex h-full items-center justify-center">
              <Calendar className="text-muted-foreground h-12 w-12" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            {event.is_free ? (
              <Badge className="bg-green-500 text-white">{t('free')}</Badge>
            ) : (
              <Badge variant="secondary">
                {event.price} {event.currency}
              </Badge>
            )}
            {event.is_online && (
              <Badge variant="secondary">
                <Globe className="mr-1 h-3 w-3" />
                Online
              </Badge>
            )}
          </div>
          {isAuthenticated && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white"
            >
              <Heart
                className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
              />
            </button>
          )}
        </div>
        <CardContent className="p-4">
          {categoryLabel && (
            <Badge variant="outline" className="mb-2 text-xs">
              {categoryLabel}
            </Badge>
          )}
          <h3 className="mb-1 line-clamp-2 font-semibold">{event.title}</h3>
          <p className="text-muted-foreground mb-2 text-sm">{formatDate(event.starts_at, locale)}</p>
          <div className="text-muted-foreground mb-3 flex items-center gap-1 text-sm">
            {event.is_online ? (
              <>
                <Globe className="h-3.5 w-3.5" />
                <span>Online</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.city}{event.country ? `, ${event.country}` : ''}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <Users className="h-3.5 w-3.5" />
              <span>{t('attendees', { count: goingCount })}</span>
              {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {t('spotsLeft', { count: spotsLeft })}
                </Badge>
              )}
              {spotsLeft !== null && spotsLeft <= 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {t('noSpotsLeft')}
                </Badge>
              )}
            </div>
            {isAuthenticated && (
              <Button
                size="sm"
                variant={going ? 'secondary' : 'default'}
                onClick={handleToggleGoing}
              >
                {going ? t('going') : t('join')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
