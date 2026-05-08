'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CrewCardProps {
  id: string;
  name: string;
  languages: string[];
  capacity: number;
  participant_count: number;
  onRequestJoin?: (crewId: string) => void;
  isUserInCrew?: boolean;
}

/**
 * Public crew card displayed on the event page.
 * Shows crew name, supported languages, available spots,
 * and a "Request to join" button when applicable.
 */
export function CrewCard({
  id,
  name,
  languages,
  capacity,
  participant_count,
  onRequestJoin,
  isUserInCrew = false,
}: CrewCardProps) {
  const t = useTranslations('crew');

  const isFull = participant_count >= capacity;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug">{name}</h3>

          {languages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {languages.map((lang) => (
                <Badge key={lang} variant="secondary" className="text-[11px]">
                  {lang}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {isFull
              ? t('spots_full', { max: capacity })
              : t('spots_available', { current: participant_count, max: capacity })}
          </div>
        </div>

        <div className="flex shrink-0 items-start">
          {isFull ? (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {t('crew_full')}
            </Badge>
          ) : (
            !isUserInCrew &&
            onRequestJoin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRequestJoin(id)}
              >
                {t('request_to_join')}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
