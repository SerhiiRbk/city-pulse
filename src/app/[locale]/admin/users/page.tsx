import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/server/viewer-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { AdminBlockToggleButton } from '@/components/admin/block-toggle-button';
import { RoleSelect } from '@/components/admin/role-select';
import type { AssignableRole } from '@/lib/actions/admin-roles';

type ProfileRole = AssignableRole | 'system';

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const page = Number(filters.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  const viewer = await getViewerContext();
  const { data: users, count, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url, role, city, country, is_available, is_blocked, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load users: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const userList = Array.isArray(users) ? users : [];
  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users ({count || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {userList.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
            >
              <Link href={`/profile/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback>{u.display_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.display_name}</p>
                  <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {u.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                {u.city && (
                  <span className="text-muted-foreground text-xs">{u.city}</span>
                )}
                <span className="text-muted-foreground text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
                <RoleSelect
                  userId={u.id}
                  currentRole={u.role as ProfileRole}
                  viewerId={viewer.userId ?? ''}
                />
                <AdminBlockToggleButton
                  targetType="user"
                  targetId={u.id}
                  blocked={u.is_blocked}
                  compact
                />
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
              <Link
                key={i}
                href={`/admin/users?page=${i + 1}`}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border'}`}
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
