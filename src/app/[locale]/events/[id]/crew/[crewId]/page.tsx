import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { getCrewDetails } from '@/lib/actions/crew';
import { getEventRaw } from '@/lib/actions/events';
import { CrewPanel } from '@/components/crew/CrewPanel';
import { CrewChat } from '@/components/crew/CrewChat';

type Props = {
  params: Promise<{ locale: string; id: string; crewId: string }>;
};

export default async function CrewDetailPage({ params }: Props) {
  const { locale, id: eventId, crewId } = await params;
  setRequestLocale(locale);

  // 1. Auth check
  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  // 2. Fetch crew details (validates membership server-side)
  const result = await getCrewDetails({ crew_id: crewId });

  // 3. If user is not a member or crew not found, redirect to event page
  if (result.error || !result.crew || !result.myRole) {
    redirect({ href: `/events/${eventId}`, locale });
    return null;
  }

  const { crew, myRole } = result;
  const isArchived = crew.status === 'archived';

  // Fetch event data for invite link management
  const event = await getEventRaw(eventId);
  const eventName = event?.title ?? '';
  const isEventEnded = event?.starts_at && event?.duration_minutes
    ? new Date(event.starts_at).getTime() + event.duration_minutes * 60 * 1000 < Date.now()
    : false;

  // 4. Map crew data to CrewPanel props format
  const panelCrew = {
    ...crew,
    members: crew.members.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
    })),
    pendingInvitations: crew.pendingInvitations?.map((inv) => ({
      id: inv.id,
      invitee_id: inv.invitee_id,
      invitee_name: inv.invitee_display_name,
      invitee_avatar: inv.invitee_avatar_url,
      created_at: inv.created_at,
    })),
    pendingRequests: crew.pendingRequests?.map((req) => ({
      id: req.id,
      requester_id: req.requester_id,
      requester_name: req.requester_display_name,
      requester_avatar: req.requester_avatar_url,
      message: req.message,
      created_at: req.created_at,
    })),
  };

  // 5. Render CrewPanel and CrewChat side by side (stacked on mobile)
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Back to event link */}
      <a
        href={`/${locale}/events/${eventId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {eventName || 'Back to event'}
      </a>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        {/* Left/top: Crew management panel */}
        <div className="lg:col-span-2">
          <CrewPanel
            crew={panelCrew}
            myRole={myRole}
            currentUserId={user!.id}
            eventId={eventId}
            eventName={eventName}
            isEventEnded={isEventEnded}
          />
        </div>

        {/* Right/bottom: Real-time chat */}
        <div className="lg:col-span-3">
          <div className="h-[calc(100vh-12rem)] rounded-2xl border border-border/60 bg-card shadow-sm">
            <CrewChat
              crewId={crewId}
              isArchived={isArchived}
              currentUserId={user!.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
