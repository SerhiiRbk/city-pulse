'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Edit,
  Globe,
  Languages,
  Loader2,
  Lock,
  LogOut,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { CrewMemberList } from '@/components/crew/CrewMemberList';
import { CrewJoinRequestCard } from '@/components/crew/CrewJoinRequestCard';

import {
  deleteCrew,
  leaveCrew,
  promoteModerator,
  demoteModerator,
  removeMember,
  respondToJoinRequest,
} from '@/lib/actions/crew';
import {
  CREW_NAME_MIN_LENGTH,
  CREW_NAME_MAX_LENGTH,
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_CAPACITY_MIN,
  CREW_CAPACITY_MAX,
} from '@/lib/constants/crew';
import type { EventCrew, CrewRole } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrewMemberInfo {
  user_id: string;
  role: CrewRole;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

interface PendingInvitation {
  id: string;
  invitee_id: string;
  invitee_name: string;
  invitee_avatar: string | null;
  created_at: string;
}

interface PendingRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  message: string | null;
  created_at: string;
}

export interface CrewPanelProps {
  crew: EventCrew & {
    members: CrewMemberInfo[];
    pendingInvitations?: PendingInvitation[];
    pendingRequests?: PendingRequest[];
  };
  myRole: CrewRole;
  currentUserId: string;
  eventId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CrewPanel({ crew, myRole, currentUserId, eventId }: CrewPanelProps) {
  const t = useTranslations('crew');
  const router = useRouter();

  const isHost = myRole === 'host';
  const isModerator = myRole === 'moderator';
  const canManage = isHost || isModerator;

  // Settings edit state (host only)
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(crew.name);
  const [editDescription, setEditDescription] = useState(crew.description);
  const [editCapacity, setEditCapacity] = useState(crew.capacity);
  const [editVisibility, setEditVisibility] = useState(crew.visibility);
  const [saving, setSaving] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleSaveSettings() {
    setSaving(true);
    try {
      // updateCrew is expected to exist in crew.ts per the design
      const { updateCrew } = await import('@/lib/actions/crew');
      const result = await updateCrew({
        crew_id: crew.id,
        name: editName.trim(),
        description: editDescription.trim(),
        capacity: editCapacity,
        visibility: editVisibility,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t('settings_saved'));
        setEditing(false);
        router.refresh();
      }
    } catch {
      toast.error(t('settings_save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePromoteModerator(userId: string) {
    setActionLoading(`promote-${userId}`);
    const result = await promoteModerator({ crew_id: crew.id, user_id: userId });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('promote_moderator_success'));
      router.refresh();
    }
    setActionLoading(null);
  }

  async function handleDemoteModerator(userId: string) {
    setActionLoading(`demote-${userId}`);
    const result = await demoteModerator({ crew_id: crew.id, user_id: userId });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('demote_moderator_success'));
      router.refresh();
    }
    setActionLoading(null);
  }

  async function handleRemoveMember(userId: string) {
    setActionLoading(`remove-${userId}`);
    const result = await removeMember({ crew_id: crew.id, user_id: userId });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('remove_member_success'));
      router.refresh();
    }
    setActionLoading(null);
  }

  async function handleLeaveCrew() {
    setActionLoading('leave');
    const result = await leaveCrew({ crew_id: crew.id });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('leave_crew_success'));
      router.push(`/events/${eventId}`);
    }
    setActionLoading(null);
  }

  async function handleDeleteCrew() {
    setActionLoading('delete');
    const result = await deleteCrew({ crew_id: crew.id });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('delete_crew_success'));
      router.push(`/events/${eventId}`);
    }
    setActionLoading(null);
  }

  async function handleRespondToJoinRequest(requestId: string, accept: boolean) {
    setActionLoading(`request-${requestId}`);
    const result = await respondToJoinRequest({ request_id: requestId, accept });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(accept ? t('request_accepted') : t('request_rejected'));
      router.refresh();
    }
    setActionLoading(null);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Crew Info Section */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-snug">{crew.name}</h2>
            {crew.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {crew.description}
              </p>
            )}
          </div>
          {isHost && !editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={t('edit_settings')}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Crew metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {t('spots_available', {
              current: crew.participant_count,
              max: crew.capacity,
            })}
          </span>

          <span className="inline-flex items-center gap-1">
            {crew.visibility === 'public' ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {crew.visibility === 'public' ? t('visibility_public') : t('visibility_private')}
          </span>

          {crew.languages.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Languages className="h-3.5 w-3.5" />
              {crew.languages.join(', ')}
            </span>
          )}
        </div>
      </section>

      {/* Settings Section (Host only, when editing) */}
      {isHost && editing && (
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">{t('settings_title')}</h3>
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-crew-name">
                {t('field_name')}
              </label>
              <Input
                id="edit-crew-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                minLength={CREW_NAME_MIN_LENGTH}
                maxLength={CREW_NAME_MAX_LENGTH}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-crew-description">
                {t('field_description')}
              </label>
              <Textarea
                id="edit-crew-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={CREW_DESCRIPTION_MAX_LENGTH}
              />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-crew-capacity">
                {t('field_capacity')}
              </label>
              <Input
                id="edit-crew-capacity"
                type="number"
                inputMode="numeric"
                min={CREW_CAPACITY_MIN}
                max={CREW_CAPACITY_MAX}
                value={editCapacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= CREW_CAPACITY_MIN && val <= CREW_CAPACITY_MAX) {
                    setEditCapacity(val);
                  }
                }}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
              <div className="flex items-start gap-2 pr-4">
                {editVisibility === 'public' ? (
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('field_visibility')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('field_visibility_hint')}
                  </p>
                </div>
              </div>
              <Switch
                checked={editVisibility === 'public'}
                onCheckedChange={(checked) =>
                  setEditVisibility(checked ? 'public' : 'private')
                }
              />
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t('save_settings')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditName(crew.name);
                  setEditDescription(crew.description);
                  setEditCapacity(crew.capacity);
                  setEditVisibility(crew.visibility);
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Invite Members Button (Host/Moderator) */}
      {canManage && (
        <section>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              // Navigate to invite flow or open invite dialog
              // This will be handled by the ContactsPicker in a dialog
              toast.info(t('invite_members'));
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t('invite_members')}
          </Button>
        </section>
      )}

      {/* Member List */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">
          {t('members_title', { count: crew.members.length })}
        </h3>
        <CrewMemberList
          members={crew.members}
          currentUserId={currentUserId}
          myRole={myRole}
          onPromote={isHost ? handlePromoteModerator : undefined}
          onDemote={isHost ? handleDemoteModerator : undefined}
          onRemove={isHost ? handleRemoveMember : undefined}
          actionLoading={actionLoading}
        />
      </section>

      {/* Pending Invitations (Host/Moderator) */}
      {canManage &&
        crew.pendingInvitations &&
        crew.pendingInvitations.length > 0 && (
          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">
              {t('pending_invitations')} ({crew.pendingInvitations.length})
            </h3>
            <div className="space-y-2">
              {crew.pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2"
                >
                  <span className="text-sm">{invitation.invitee_name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t('pending_invitations')}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* Pending Join Requests (Host/Moderator) */}
      {canManage &&
        crew.pendingRequests &&
        crew.pendingRequests.length > 0 && (
          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">
              {t('pending_requests')} ({crew.pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {crew.pendingRequests.map((request) => (
                <CrewJoinRequestCard
                  key={request.id}
                  id={request.id}
                  requesterName={request.requester_name}
                  requesterAvatarUrl={request.requester_avatar}
                  message={request.message}
                  onAccept={() => handleRespondToJoinRequest(request.id, true)}
                  onReject={() => handleRespondToJoinRequest(request.id, false)}
                  loading={actionLoading === `request-${request.id}`}
                />
              ))}
            </div>
          </section>
        )}

      {/* Leave / Delete Actions */}
      <section className="space-y-3">
        {/* Leave Crew — all members */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full rounded-xl text-destructive hover:text-destructive"
              disabled={actionLoading === 'leave'}
            >
              {actionLoading === 'leave' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {t('leave_crew')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('leave_crew_confirm_title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('leave_crew_confirm_description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveCrew}>
                {t('leave_crew')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Crew — host only */}
        {isHost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                disabled={actionLoading === 'delete'}
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('delete_crew')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('delete_crew_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('delete_crew_confirm_description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCrew}>
                  {t('delete_crew')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>
    </div>
  );
}
