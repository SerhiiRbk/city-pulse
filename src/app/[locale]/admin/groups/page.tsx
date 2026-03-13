import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { MapPin, CalendarDays, Users } from 'lucide-react';
import { AdminBlockToggleButton } from '@/components/admin/block-toggle-button';

export default async function AdminGroupsPage({
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
  const { data: groups, count } = await supabase
    .from('groups_with_counts')
    .select('id, name, city, member_count, event_count, creator_name, created_at, is_blocked', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups ({count || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(groups || []).map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
            >
              <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  {group.is_blocked && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                  <span>{group.creator_name || 'Unknown creator'}</span>
                  {group.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {group.city}
                    </span>
                  )}
                  <span>{new Date(group.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" /> {group.member_count}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CalendarDays className="h-3 w-3" /> {group.event_count}
                </span>
                <AdminBlockToggleButton
                  targetType="group"
                  targetId={group.id}
                  blocked={Boolean(group.is_blocked)}
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
                href={`/admin/groups?page=${i + 1}`}
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
