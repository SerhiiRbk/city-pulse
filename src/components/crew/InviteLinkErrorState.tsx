'use client';

import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  Archive,
  Ban,
  CalendarX,
  Clock,
  Link2Off,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InviteLinkErrorStatus =
  | 'expired'
  | 'revoked'
  | 'crew_deleted'
  | 'crew_archived'
  | 'event_ended'
  | 'invalid'
  | 'blocked'
  | 'kicked';

interface InviteLinkErrorStateProps {
  status: InviteLinkErrorStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps each error status to a lucide icon component.
 */
function getIcon(status: InviteLinkErrorStatus) {
  switch (status) {
    case 'expired':
      return Clock;
    case 'revoked':
      return Link2Off;
    case 'crew_deleted':
      return Trash2;
    case 'crew_archived':
      return Archive;
    case 'event_ended':
      return CalendarX;
    case 'blocked':
    case 'kicked':
      return Ban;
    case 'invalid':
    default:
      return AlertCircle;
  }
}

/**
 * Maps each error status to the corresponding i18n key for the message.
 * - `blocked` uses the generic `invalid` message to avoid information leakage (Req 3.15).
 * - `kicked` uses `cannotJoin` (Req 4.12).
 */
function getMessageKey(status: InviteLinkErrorStatus): string {
  switch (status) {
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    case 'crew_deleted':
      return 'crewDeleted';
    case 'crew_archived':
      return 'crewArchived';
    case 'event_ended':
      return 'eventEnded';
    case 'kicked':
      return 'cannotJoin';
    case 'blocked':
    case 'invalid':
    default:
      return 'invalid';
  }
}

/**
 * Maps each error status to a title i18n key.
 */
function getTitleKey(status: InviteLinkErrorStatus): string {
  switch (status) {
    case 'expired':
      return 'expiredTitle';
    case 'revoked':
      return 'revokedTitle';
    case 'crew_deleted':
      return 'crewDeletedTitle';
    case 'crew_archived':
      return 'crewArchivedTitle';
    case 'event_ended':
      return 'eventEndedTitle';
    case 'kicked':
      return 'cannotJoinTitle';
    case 'blocked':
    case 'invalid':
    default:
      return 'invalidTitle';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a localized error state for invite link validation failures.
 * Displays an icon, title, and descriptive message with suggested actions
 * embedded in the message text (e.g., "ask sender for new link" for expired).
 *
 * Requirements: 3.4, 3.5, 3.6, 3.9, 3.10, 3.12, 3.19
 */
export function InviteLinkErrorState({ status }: InviteLinkErrorStateProps) {
  const t = useTranslations('invite.error');

  const Icon = getIcon(status);
  const messageKey = getMessageKey(status);
  const titleKey = getTitleKey(status);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Icon className="h-7 w-7" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-xl font-semibold">{t(titleKey)}</h2>

        {/* Message with suggested action */}
        <p className="text-sm text-muted-foreground">{t(messageKey)}</p>
      </div>
    </div>
  );
}
