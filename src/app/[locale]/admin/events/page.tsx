import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { MapPin, Users } from 'lucide-react';

export default async function AdminEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;
  const status = filters.status || 'published';
  const page = Number(filters.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  let query = supabase
    .from('events_with_counts')
    .select('id, title, status, city, going_count, starts_at, is_system, organizer_name', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') query = query.eq('status', status);

  const { data: events, count } = await query;

  const statuses = ['all', 'published', 'draft', 'completed', 'cancelled'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Events ({count || 0})</CardTitle>
          <div className="flex gap-1">
            {statuses.map((s) => (
              <Link key={s} href={`/admin/events?status=${s}`}>
                <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer capitalize">
                  {s}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(events || []).map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  {e.is_system && <Badge variant="secondary" className="text-xs">System</Badge>}
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <span>{e.organizer_name}</span>
                  {e.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {e.city}
                    </span>
                  )}
                  <span>{new Date(e.starts_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    e.status === 'published' ? 'default' :
                    e.status === 'cancelled' ? 'destructive' :
                    'secondary'
                  }
                  className="text-xs"
                >
                  {e.status}
                </Badge>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" /> {e.going_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
