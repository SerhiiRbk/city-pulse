'use client';

import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  };
}

export function GroupCard({ group }: GroupCardProps) {
  const t = useTranslations('groups');

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="p-5">
          <h3 className="mb-2 line-clamp-1 text-xl font-extrabold tracking-tight group-hover:text-primary transition-colors">{group.name}</h3>
          <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">{group.description}</p>
          <div className="text-muted-foreground flex items-center gap-5 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{t('members', { count: group.member_count })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{group.event_count}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
