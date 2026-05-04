'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ASSIGNABLE_ROLES,
  setUserRole,
  type AssignableRole,
} from '@/lib/actions/admin-roles';

type Props = {
  userId: string;
  currentRole: AssignableRole | 'system';
  /**
   * The viewer's own profile id. When this matches `userId` we
   * lock the dropdown so an admin can't change their own role —
   * the SQL trigger enforces this too, but locking the UI removes
   * any expectation that it might be possible.
   */
  viewerId: string;
};

const ROLE_LABELS: Record<AssignableRole | 'system', string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
  // Shown only when the row already has it; never selectable.
  system: 'System',
};

export function RoleSelect({ userId, currentRole, viewerId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic local mirror so the trigger label flips immediately;
  // we revert on failure.
  const [role, setRole] = useState<AssignableRole | 'system'>(currentRole);
  const isSelf = userId === viewerId;
  // Service-account rows shouldn't be reassignable from the UI —
  // there's no safe label to pick (downgrading them breaks the
  // afisha bot). Hide the dropdown entirely.
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <span className="rounded-md border border-border/60 bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        {ROLE_LABELS.system}
      </span>
    );
  }

  function handleChange(next: string) {
    if (next === role) return;
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(next)) return;

    const previous = role;
    const nextRole = next as AssignableRole;
    setRole(nextRole);

    startTransition(async () => {
      const result = await setUserRole(userId, nextRole);
      if ('error' in result && result.error) {
        setRole(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Role updated to ${ROLE_LABELS[nextRole]}`);
      // Re-render the table from the server so the role badge,
      // counts, and audit log on the next page reload are in sync.
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={role} onValueChange={handleChange} disabled={isSelf || pending}>
        <SelectTrigger
          size="sm"
          className="h-8 w-[120px] rounded-lg text-xs"
          aria-label="Change user role"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_ROLES.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
