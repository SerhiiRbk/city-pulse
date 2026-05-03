import { getTranslations } from 'next-intl/server';
import { Users } from 'lucide-react';

import { getMeetupsForSystemEvent } from '@/lib/actions/meetups';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { CreateMeetupDialog } from './create-meetup-dialog';
import { MeetupCard } from './meetup-card';

interface SystemEventMeetupsProps {
  parentEvent: {
    id: string;
    title: string;
    starts_at: string;
    city?: string | null;
    address?: string | null;
  };
  isAuthenticated: boolean;
}

/**
 * "Идём вместе" section rendered on a system event detail page. It owns
 * fetching the related meetups (so the parent page doesn't have to plumb
 * meetup logic through), renders an empty-state CTA + create dialog for
 * authed users, and surfaces login prompt for visitors.
 */
export async function SystemEventMeetups({
  parentEvent,
  isAuthenticated,
}: SystemEventMeetupsProps) {
  const t = await getTranslations('events.meetup');
  const meetups = await getMeetupsForSystemEvent(parentEvent.id);

  return (
    <section
      id="meetups"
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t('sectionLabel')}
            </span>
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            {meetups.length > 0
              ? t('sectionTitleWithCount', { count: meetups.length })
              : t('sectionTitleEmpty')}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {t('sectionDescription')}
          </p>
        </div>

        {isAuthenticated ? (
          <CreateMeetupDialog parentEvent={parentEvent} />
        ) : (
          <Button asChild size="lg" className="rounded-xl">
            <Link href={`/login?redirect=/events/${parentEvent.id}`}>
              {t('ctaLogin')}
            </Link>
          </Button>
        )}
      </div>

      {meetups.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {meetups.map((meetup) => {
            const spotsLeft =
              meetup.max_attendees != null
                ? meetup.max_attendees - (meetup.going_count ?? 0)
                : null;
            const spotsLeftLabel =
              spotsLeft != null && spotsLeft > 0 && spotsLeft <= 5
                ? t('spotsLeft', { count: spotsLeft })
                : spotsLeft != null && spotsLeft <= 0
                  ? t('full')
                  : null;

            return (
              <MeetupCard
                key={meetup.id}
                meetup={{
                  id: meetup.id,
                  title: meetup.title,
                  description: meetup.description,
                  going_count: meetup.going_count ?? 0,
                  max_attendees: meetup.max_attendees,
                  address: meetup.address,
                  is_private: meetup.is_private,
                  organizer_id: meetup.organizer_id,
                  organizer_name: meetup.organizer_name,
                  organizer_avatar: meetup.organizer_avatar,
                }}
                goingLabel={t('goingCount', { count: meetup.going_count ?? 0 })}
                spotsLeftLabel={spotsLeftLabel}
                privateLabel={t('private')}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
