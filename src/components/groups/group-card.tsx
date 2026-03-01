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
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative h-40 overflow-hidden">
          {group.cover_url ? (
            <img
              src={group.cover_url}
              alt={group.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="from-primary/20 to-primary/5 flex h-full items-center justify-center bg-gradient-to-br">
              <Users className="text-primary/40 h-16 w-16" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="mb-1 line-clamp-1 text-lg font-semibold">{group.name}</h3>
          <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">{group.description}</p>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{t('members', { count: group.member_count })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{group.event_count}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
