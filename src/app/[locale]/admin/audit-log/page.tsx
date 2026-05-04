import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from '@/i18n/navigation';
import { Shield } from 'lucide-react';
import type { AdminAuditLogEntry } from '@/types/database';

const PAGE_SIZE = 50;

const ROLE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  admin: 'default',
  moderator: 'secondary',
  user: 'outline',
  system: 'outline',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={ROLE_BADGE_VARIANT[role] ?? 'outline'} className="font-mono text-[10px] uppercase tracking-wider">
      {role}
    </Badge>
  );
}

type ProfileLite = { id: string; display_name: string | null; email: string | null };

export default async function AdminAuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const page = Math.max(1, Number(filters.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: rawEntries, count } = await supabase
    .from('admin_audit_log')
    .select('id, actor_id, actor_email_snapshot, action, target_type, target_id, metadata, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const entries: AdminAuditLogEntry[] = (rawEntries ?? []) as AdminAuditLogEntry[];

  // Resolve actor and target profiles in two batched queries instead
  // of N+1 — even with 50 rows the page renders in a single round-trip.
  const actorIds = Array.from(
    new Set(entries.map((e) => e.actor_id).filter((id): id is string => Boolean(id))),
  );
  const targetIds = Array.from(
    new Set(
      entries
        .filter((e) => e.target_type === 'profile')
        .map((e) => e.target_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const profileLookup = new Map<string, ProfileLite>();
  if (actorIds.length || targetIds.length) {
    const allIds = Array.from(new Set([...actorIds, ...targetIds]));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', allIds);

    for (const profile of profiles ?? []) {
      profileLookup.set(profile.id, profile as ProfileLite);
    }
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin audit log ({count || 0})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tamper-resistant log of privileged actions. Currently captures role changes; the schema is generic enough to extend with block/unblock, feature-flag toggles, and editorial actions.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No admin actions recorded yet.
            </p>
          )}

          {entries.map((entry) => {
            const actor = entry.actor_id ? profileLookup.get(entry.actor_id) : null;
            const actorLabel =
              actor?.display_name || actor?.email || entry.actor_email_snapshot || 'Unknown actor';
            const target =
              entry.target_type === 'profile' && entry.target_id
                ? profileLookup.get(entry.target_id)
                : null;
            const targetLabel = target?.display_name || target?.email || entry.target_id || '—';
            const fromRole = String(entry.metadata?.from_role ?? '—');
            const toRole = String(entry.metadata?.to_role ?? '—');

            return (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[11px]">
                      {(actorLabel?.[0] || '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    {entry.actor_id ? (
                      <Link
                        href={`/profile/${entry.actor_id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {actorLabel}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium text-muted-foreground">
                        {actorLabel}
                      </span>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.action === 'profile.role_change' ? 'Changed role of' : entry.action}{' '}
                      {entry.target_type === 'profile' && entry.target_id ? (
                        <Link
                          href={`/profile/${entry.target_id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {targetLabel}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{targetLabel}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {entry.action === 'profile.role_change' && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1">
                      <RoleBadge role={fromRole} />
                      <span className="text-xs text-muted-foreground">→</span>
                      <RoleBadge role={toRole} />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
              <Link
                key={i}
                href={{ pathname: '/admin/audit-log', query: { page: i + 1 } }}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm ${
                  page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border'
                }`}
              >
                {i + 1}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
