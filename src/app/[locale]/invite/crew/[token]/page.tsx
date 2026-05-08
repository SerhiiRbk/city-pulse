import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { validateInviteToken } from '@/lib/actions/crew-invite';
import { InviteLinkErrorState } from '@/components/crew/InviteLinkErrorState';
import { JoinConfirmationDialog } from '@/components/crew/JoinConfirmationDialog';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

// ---------------------------------------------------------------------------
// OG Data Helper — fetches minimal crew+event data by token (no auth required)
// ---------------------------------------------------------------------------

async function getInviteLinkOGData(token: string) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch the invite link record by token
    const { data: link, error: linkError } = await supabase
      .from('crew_invite_links')
      .select('crew_id, status, expires_at')
      .eq('token', token)
      .single();

    if (linkError || !link) return null;

    // Skip if link is not active
    if (link.status !== 'active') return null;
    if (new Date(link.expires_at) <= new Date()) return null;

    // 2. Fetch the crew name from event_crews
    const { data: crew, error: crewError } = await supabase
      .from('event_crews')
      .select('name, event_id')
      .eq('id', link.crew_id)
      .single();

    if (crewError || !crew) return null;

    // 3. Fetch the event title and cover image from events
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, photos')
      .eq('id', crew.event_id)
      .single();

    if (eventError || !event) return null;

    return {
      crewName: crew.name,
      eventTitle: event.title,
      eventCoverUrl: event.photos?.[0] || null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// generateMetadata — OG tags for rich link previews in messengers
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const data = await getInviteLinkOGData(token);

  if (!data) {
    return {
      title: 'Invite Link',
      robots: { index: false, follow: false },
    };
  }

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/invite/crew/${token}`,
    title: `Join "${data.crewName}" for ${data.eventTitle}`,
    description: `You're invited to join a crew for ${data.eventTitle}`,
    image: data.eventCoverUrl,
    imageAlt: `${data.crewName} — ${data.eventTitle}`,
    type: 'website',
    robots: { index: false, follow: false },
  });
}

export default async function InviteLinkPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // 1. Check authentication status
  const user = await getUser();

  // 2. If not authenticated, redirect to login with redirectTo param
  if (!user) {
    redirect({
      href: `/login?redirectTo=/invite/crew/${token}`,
      locale: locale as Locale,
    });
    return null; // unreachable — helps TypeScript narrow `user` to non-null
  }

  // 3. Validate the invite token
  const result = await validateInviteToken(token, user.id);

  // 4. Handle validation result
  switch (result.status) {
    case 'already_member':
      // Redirect to crew detail page (Requirement 3.13, 3.14)
      redirect({
        href: `/events/${result.eventId}/crew/${result.crewId}`,
        locale: locale as Locale,
      });
      break;

    case 'crew_full':
      // Redirect to event page with toast query param (Requirement 3.7)
      redirect({
        href: `/events/${result.eventId}?toast=crew_full`,
        locale: locale as Locale,
      });
      break;

    case 'valid':
      // Render JoinConfirmationDialog (Requirements 3.1, 3.8, 3.16, 3.17)
      return (
        <JoinConfirmationDialog
          crew={result.crew}
          event={result.event}
          inviter={result.inviter}
          token={token}
          locale={locale}
        />
      );

    default:
      // Error states: expired, revoked, crew_deleted, crew_archived, event_ended, invalid, blocked
      return <InviteLinkErrorState status={result.status} />;
  }
}
