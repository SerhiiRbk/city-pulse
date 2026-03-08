'use client';

import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, MapPin } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { COUNTRIES } from '@/lib/constants';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string;
    cover_url: string | null;
    member_count: number;
    event_count: number;
    creator_name: string | null;
    creator_avatar: string | null;
    city: string | null;
    country: string | null;
    city_name?: string | null;
    city_translations?: Record<string, string> | null;
  };
}

export function GroupCard({ group }: GroupCardProps) {
  const t = useTranslations('groups');
  const tDetail = useTranslations('groups.detail');
  const locale = useLocale();
  const cityLabel = group.city_translations?.[locale] || group.city_name || group.city || '';
  const countryDisplay = group.country
    ? (() => {
      const country = COUNTRIES.find((c) => c.code === group.country);
      return country ? ((country as Record<string, string>)[locale] || country.en) : group.country;
    })()
    : '';
  const activityCue = group.event_count > 3 ? t('cueActive') : group.member_count > 20 ? t('cueWelcoming') : t('cueGrowing');

  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="group gap-0 overflow-hidden rounded-3xl border-border/50 pt-0 pb-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative h-56 overflow-hidden">
          {group.cover_url ? (
            <img
              src={group.cover_url}
              alt={group.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="from-primary/20 to-primary/5 flex h-full items-center justify-center bg-gradient-to-br">
              <Users className="text-primary/40 h-16 w-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-md">
              <Users className="mr-1 h-3 w-3" />
              {group.member_count}
            </Badge>
          </div>
          <div className="absolute right-3 bottom-3">
            <Badge className="bg-black/35 text-white backdrop-blur-md hover:bg-black/35">
              {activityCue}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <h3 className="mb-2 line-clamp-1 text-xl font-bold tracking-tight">{group.name}</h3>
          <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">{group.description}</p>
          {(cityLabel || group.country) && (
            <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{[cityLabel, countryDisplay].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="text-muted-foreground flex items-center gap-5 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{t('members', { count: group.member_count })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{tDetail('eventsCount', { count: group.event_count })}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
