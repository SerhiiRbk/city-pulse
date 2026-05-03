'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { buildGoogleCalendarUrl } from '@/lib/calendar-utils';

interface Props {
  event: {
    id: string;
    title: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    starts_at: string;
    duration_minutes: number;
    is_online?: boolean;
  };
  className?: string;
}

/**
 * Sidebar button that lets the visitor push the event into their
 * personal calendar without any OAuth flow:
 *   - Google Calendar deep-link with the event prefilled.
 *   - Apple/Outlook flow via webcal:// .ics download.
 */
export function AddToCalendarButton({ event, className }: Props) {
  const t = useTranslations('events.detail');
  const googleUrl = buildGoogleCalendarUrl(event);
  const icsUrl = `/api/calendar/${event.id}/ical`;
  // webcal:// hands off to the system calendar app on iOS/macOS.
  const webcalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin.replace(/^https?:\/\//, 'webcal://')}${icsUrl}`
      : icsUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={className ?? 'w-full rounded-xl'}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t('addToCalendar')}
          <ChevronDown className="ml-auto h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <Calendar className="mr-2 h-4 w-4" />
            {t('addToGoogle')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={webcalUrl}>
            <Calendar className="mr-2 h-4 w-4" />
            {t('addToApple')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={icsUrl} download={`event-${event.id}.ics`}>
            <Download className="mr-2 h-4 w-4" />
            {t('downloadIcs')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
