'use client';

import { useTranslations } from 'next-intl';
import { Crown, Shield, MoreVertical, UserMinus, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CrewRole } from '@/types/database';

export interface CrewMember {
  user_id: string;
  role: CrewRole;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

export interface CrewMemberListProps {
  members: CrewMember[];
  currentUserId: string;
  myRole: CrewRole;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  /** User ID currently being acted upon (shows loading spinner) */
  actionLoading?: string | null;
}

/**
 * Displays crew members with avatars, role badges, and action menus.
 * Host sees a crown badge, moderators get a shield badge.
 * When the current user is the host, an action dropdown is shown per member.
 */
export function CrewMemberList({
  members,
  currentUserId,
  myRole,
  onPromote,
  onDemote,
  onRemove,
  actionLoading = null,
}: CrewMemberListProps) {
  const t = useTranslations('crew');

  return (
    <div className="space-y-1">
      {members.map((member) => (
        <div
          key={member.user_id}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50"
        >
          {/* Avatar with role indicator */}
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {member.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            {member.role === 'host' && (
              <span
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background"
                title={t('role_host')}
              >
                <Crown className="h-2.5 w-2.5" />
              </span>
            )}
            {member.role === 'moderator' && (
              <span
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-background"
                title={t('role_moderator')}
              >
                <Shield className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Name and role badge */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {member.display_name}
            </p>
            <RoleBadge role={member.role} label={t(`role_${member.role}`)} />
          </div>

          {/* Loading indicator for the member being acted upon */}
          {actionLoading === member.user_id && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}

          {/* Action menu — only visible to host, not on themselves */}
          {myRole === 'host' &&
            member.user_id !== currentUserId &&
            member.role !== 'host' &&
            actionLoading !== member.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={t('member_actions')}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {member.role === 'member' && onPromote && (
                    <DropdownMenuItem onClick={() => onPromote(member.user_id)}>
                      <ArrowUp className="h-4 w-4" />
                      {t('promote_moderator')}
                    </DropdownMenuItem>
                  )}
                  {member.role === 'moderator' && onDemote && (
                    <DropdownMenuItem onClick={() => onDemote(member.user_id)}>
                      <ArrowDown className="h-4 w-4" />
                      {t('demote_moderator')}
                    </DropdownMenuItem>
                  )}
                  {onRemove && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRemove(member.user_id)}
                    >
                      <UserMinus className="h-4 w-4" />
                      {t('remove_member')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      ))}
    </div>
  );
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  if (role === 'host') {
    return (
      <Badge variant="secondary" className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
        <Crown className="h-2.5 w-2.5" />
        {label}
      </Badge>
    );
  }
  if (role === 'moderator') {
    return (
      <Badge variant="secondary" className="mt-0.5 text-[10px] text-blue-700 dark:text-blue-400">
        <Shield className="h-2.5 w-2.5" />
        {label}
      </Badge>
    );
  }
  return null;
}
