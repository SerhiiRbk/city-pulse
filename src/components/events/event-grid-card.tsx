'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Calendar, Users, Globe, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toggleFavorite } from '@/lib/actions/events';
import { toast } from 'sonner';
import { useState } from 'react';
import { COUNTRIES } from '@/lib/constants';

interface EventGridCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    photos: string[];
    starts_at: string;
    city: string | null;
    country: string | null;
    is_online: boolean;
    is_free: boolean;
    price: number | null;
    currency: string | null;
    going_count: number;
    is_system?: boolean;
    category_slug: string | null;
    category_translations: Record<string, string> | null;
    status: string;
  };
  isFavorited?: boolean;
  isAuthenticated?: boolean;
}

export function EventGridCard({ event, isFavorited: initialFav, isAuthenticated }: EventGridCardProps) {
  const tDetail = useTranslations('events.detail');
  const tCard = useTranslations('events.card');
  const locale = useLocale();
  const [favorited, setFavorited] = useState(initialFav || false);

  const categoryLabel = event.category_translations?.[locale] || event.category_translations?.['en'] || event.category_slug || '';
  const countryDisplay = event.country
    ? (() => {
      const country = COUNTRIES.find((c) => c.code === event.country);
      return country ? ((country as Record<string, string>)[locale] || country.en) : event.country;
    })()
    : '';
  const isUpcoming = new Date(event.starts_at) > new Date();

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
    <Link href={`/events/${event.id}`} className="group block">
      <article className="bg-card overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          {event.photos[0] ? (
            <img
              src={event.photos[0]}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="bg-muted flex h-full items-center justify-center">
              <Calendar className="text-muted-foreground h-16 w-16 opacity-20" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {event.is_system && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-amber-500/95 text-white backdrop-blur-md hover:bg-amber-500">
                <Sparkles className="mr-1 h-3 w-3" />
                {tCard('badgeAfisha')}
              </Badge>
            </div>
          )}

          {isAuthenticated && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
            >
              <Heart className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug">
            {event.title}
          </h3>

          {/* Category + Date row */}
          <div className="mb-3 flex items-center gap-3">
            {categoryLabel && (
              <Badge className="bg-primary hover:bg-primary rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                {categoryLabel}
              </Badge>
            )}
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(event.starts_at, locale)}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-muted-foreground mb-4 line-clamp-3 text-sm leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Footer */}
          <div className="border-border flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-3">
              {/* Status */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isUpcoming ? 'text-blue-600' : 'text-green-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isUpcoming ? 'bg-blue-500' : 'bg-green-500'}`} />
                {isUpcoming ? tCard('upcoming') : tCard('showing')}
              </span>

              {/* Location */}
              {!event.is_online && (event.city || event.country) && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {event.city || countryDisplay}
                </span>
              )}
              {event.is_online && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  {tCard('online')}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="text-sm font-bold">
              {event.is_free ? (
                <span className="text-green-600">{tCard('free')}</span>
              ) : (
                <span className="text-foreground">
                  ${event.price}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
