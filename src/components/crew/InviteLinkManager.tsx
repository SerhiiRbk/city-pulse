'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { InviteLinkShareCard } from '@/components/crew/InviteLinkShareCard';
import {
  generateInviteLink,
  revokeInviteLink,
  getActiveInviteLinks,
} from '@/lib/actions/crew-invite';
import { MAX_ACTIVE_INVITE_LINKS_PER_CREW } from '@/lib/constants/crew';
import type { CrewInviteLink } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InviteLinkManagerProps {
  crewId: string;
  crewName: string;
  eventName: string;
  userRole: 'host' | 'moderator';
  userId: string;
  isCrewFull: boolean;
  isEventEnded: boolean;
}

type EnrichedLink = CrewInviteLink & { creator_name: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InviteLinkManager({
  crewId,
  crewName,
  eventName,
  userRole,
  userId,
  isCrewFull,
  isEventEnded,
}: InviteLinkManagerProps) {
  const t = useTranslations('invite.manage');
  const tGenerate = useTranslations('invite.generate');
  const tRevoke = useTranslations('invite.revoke');
  const locale = useLocale();

  const [links, setLinks] = useState<EnrichedLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch active links on mount
  // -------------------------------------------------------------------------

  const fetchLinks = useCallback(async () => {
    const result = await getActiveInviteLinks({ crew_id: crewId });
    if (result.links) {
      setLinks(result.links);
    }
    setIsLoading(false);
  }, [crewId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // -------------------------------------------------------------------------
  // Generate new link
  // -------------------------------------------------------------------------

  const isAtMaxLinks = links.length >= MAX_ACTIVE_INVITE_LINKS_PER_CREW;
  const isGenerateDisabled = isAtMaxLinks || isCrewFull || isEventEnded;

  function handleGenerate() {
    startGenerateTransition(async () => {
      const result = await generateInviteLink({ crew_id: crewId });

      if (result.error) {
        // Map known error messages to localized strings
        if (result.error.includes('full')) {
          toast.error(tGenerate('crewFull'));
        } else if (result.error.includes('archived')) {
          toast.error(tGenerate('crewArchived'));
        } else if (result.error.includes('Maximum number')) {
          toast.error(tGenerate('maxLinks'));
        } else if (result.error.includes('invitation limit')) {
          toast.error(tGenerate('invitationLimit'));
        } else if (result.error.includes('Rate limit')) {
          toast.error(tGenerate('rateLimited'));
        } else if (result.error.includes('ended')) {
          toast.error(tGenerate('eventEnded'));
        } else {
          toast.error(result.error);
        }
        return;
      }

      if (result.url) {
        setGeneratedUrl(result.url);
      }

      // Refresh the links list
      await fetchLinks();
    });
  }

  // -------------------------------------------------------------------------
  // Revoke link
  // -------------------------------------------------------------------------

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);

    const result = await revokeInviteLink({ link_id: linkId });

    if (result.error) {
      if (result.error.includes('only revoke their own')) {
        toast.error(tRevoke('notAuthorized'));
      } else {
        toast.error(result.error);
      }
    } else {
      // Remove from local state
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      // Clear share card if the revoked link was the one just generated
      setGeneratedUrl(null);
    }

    setRevokingId(null);
  }

  // -------------------------------------------------------------------------
  // Authorization: can the current user revoke a given link?
  // -------------------------------------------------------------------------

  function canRevoke(link: EnrichedLink): boolean {
    if (userRole === 'host') return true;
    // Moderator can only revoke their own links
    return link.created_by === userId;
  }

  // -------------------------------------------------------------------------
  // Date formatting helper
  // -------------------------------------------------------------------------

  function formatLinkDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          {t('title')}
        </h3>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {links.length}/{MAX_ACTIVE_INVITE_LINKS_PER_CREW}
          </span>
        )}
      </div>

      {/* Generate button */}
      <Button
        variant="outline"
        className="w-full rounded-xl"
        disabled={isGenerateDisabled || isGenerating}
        onClick={handleGenerate}
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        {t('generateButton')}
      </Button>

      {/* Disabled state hints */}
      {isCrewFull && (
        <p className="text-xs text-muted-foreground">{tGenerate('crewFull')}</p>
      )}
      {isEventEnded && !isCrewFull && (
        <p className="text-xs text-muted-foreground">{tGenerate('eventEnded')}</p>
      )}
      {isAtMaxLinks && !isCrewFull && !isEventEnded && (
        <p className="text-xs text-muted-foreground">{tGenerate('maxLinks')}</p>
      )}

      {/* Share card after successful generation */}
      {generatedUrl && (
        <InviteLinkShareCard
          url={generatedUrl}
          crewName={crewName}
          eventName={eventName}
        />
      )}

      {/* Active links list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          {t('noLinks')}
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {t('createdBy', { name: link.creator_name })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('expiresAt', { date: formatLinkDate(link.expires_at) })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('useCount', { count: link.use_count })}
                </p>
              </div>

              {canRevoke(link) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  disabled={revokingId === link.id}
                  onClick={() => handleRevoke(link.id)}
                  aria-label={t('revokeButton')}
                >
                  {revokingId === link.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
