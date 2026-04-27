import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Users } from 'lucide-react';

interface MeetupCardProps {
  meetup: {
    id: string;
    title: string;
    description?: string | null;
    going_count: number;
    max_attendees: number | null;
    address?: string | null;
    is_private?: boolean;
    organizer_id: string;
    organizer_name?: string | null;
    organizer_avatar?: string | null;
  };
  goingLabel: string;
  spotsLeftLabel?: string | null;
  privateLabel?: string;
}

/**
 * Compact card used on the system event page to advertise an existing
 * "Идём вместе" meetup. The card intentionally hides the date/time —
 * those are inherited from the parent system event and shown in the
 * page hero, repeating them here would just create noise.
 */
export function MeetupCard({
  meetup,
  goingLabel,
  spotsLeftLabel,
  privateLabel,
}: MeetupCardProps) {
  const initials = (meetup.organizer_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href={`/events/${meetup.id}`}
      className="group block rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={meetup.organizer_avatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {meetup.title}
            </h3>
            {meetup.is_private && privateLabel && (
              <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wide">
                <Lock className="h-3 w-3" />
                {privateLabel}
              </Badge>
            )}
          </div>
          {meetup.organizer_name && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meetup.organizer_name}
            </p>
          )}
          {meetup.description && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {meetup.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {goingLabel}
            </span>
            {spotsLeftLabel && <span>{spotsLeftLabel}</span>}
            {meetup.address && (
              <span className="line-clamp-1 max-w-[18ch] truncate">
                · {meetup.address}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
