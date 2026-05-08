'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { submitJoinRequest } from '@/lib/actions/crew';

import { CrewCard } from './CrewCard';
import { CrewCreateDialog } from './CrewCreateDialog';

interface PublicCrew {
  id: string;
  name: string;
  languages: string[];
  capacity: number;
  participant_count: number;
}

interface CrewEventBlockProps {
  eventId: string;
  eventTitle: string;
  publicCrews: PublicCrew[];
  crewCount: number;
  myCrewId?: string | null;
  isOrganizer: boolean;
  isSystemEvent?: boolean;
  allowCrews: boolean;
}

/**
 * "Пойти вместе" / "Go together" section displayed on the event detail page.
 * Shows explanatory text, a "Create a Crew" button (conditionally), aggregate
 * crew count, and a list of public CrewCard components.
 *
 * Requirements: 1.1, 1.2, 6.1–6.5, 9.3
 */
export function CrewEventBlock({
  eventId,
  eventTitle,
  publicCrews,
  crewCount,
  myCrewId,
  isOrganizer,
  isSystemEvent = false,
  allowCrews,
}: CrewEventBlockProps) {
  const t = useTranslations('crew');
  const [joining, setJoining] = useState<string | null>(null);

  // For system events, the "organizer" is just the admin who created it,
  // so they should still be able to create crews.
  const showCreateButton = allowCrews && !(isOrganizer && !isSystemEvent) && !myCrewId;

  async function handleRequestJoin(crewId: string) {
    setJoining(crewId);
    try {
      const result = await submitJoinRequest({ crew_id: crewId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('request_to_join'));
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setJoining(null);
    }
  }

  return (
    <section className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t('go_together_title')}
            </span>
          </p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {t('go_together_description')}
          </p>
        </div>

        {showCreateButton && (
          <CrewCreateDialog eventId={eventId} eventTitle={eventTitle} />
        )}
      </div>

      {/* Aggregate crew count */}
      {crewCount > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{t('crews_count', { count: crewCount })}</span>
        </div>
      )}

      {/* Link to user's own crew */}
      {myCrewId && (
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link href={`/events/${eventId}/crew/${myCrewId}`}>
              {t('my_crews')}
            </Link>
          </Button>
        </div>
      )}

      {/* Public crews list */}
      {publicCrews.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {publicCrews.map((crew) => (
            <CrewCard
              key={crew.id}
              id={crew.id}
              name={crew.name}
              languages={crew.languages}
              capacity={crew.capacity}
              participant_count={crew.participant_count}
              onRequestJoin={joining === crew.id ? undefined : handleRequestJoin}
              isUserInCrew={!!myCrewId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
