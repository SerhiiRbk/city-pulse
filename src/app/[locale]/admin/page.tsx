import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getDashboardStats } from '@/lib/actions/analytics';
import { listEventFunnels } from '@/lib/actions/event-funnel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from '@/i18n/navigation';
import { Users, CalendarDays, Layers, TrendingUp, Flag, MapPin } from 'lucide-react';
import { EventFunnelCard } from '@/components/admin/event-funnel-card';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stats = await getDashboardStats();
  if (!stats) return <p>Access denied</p>;

  // Top 10 events by 30d views — surfaces both viral hits *and*
  // viral hits that aren't converting (low view→RSVP rate).
  const funnelRows = await listEventFunnels({ status: 'published', limit: 10 });
  const tFunnel = await getTranslations('admin.funnel');

  const cards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Total Events', value: stats.totalEvents, icon: CalendarDays, color: 'text-green-500' },
    { title: 'Total Groups', value: stats.totalGroups, icon: Layers, color: 'text-purple-500' },
    { title: 'Active Events', value: stats.activeEvents, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'New Users (30d)', value: stats.newUsersLast30, icon: Users, color: 'text-cyan-500' },
    { title: 'Pending Reports', value: stats.pendingReports.length, icon: Flag, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-muted-foreground text-sm">{title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSignups.map((u: { id: string; display_name: string; email: string; created_at: string }) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="hover:bg-accent flex items-center gap-3 rounded-lg p-2 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{u.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.display_name}</p>
                    <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
              {stats.recentSignups.length === 0 && (
                <p className="text-muted-foreground text-sm">No recent signups</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topEvents.map((e: { id: string; title: string; going_count: number; starts_at: string; city: string | null }) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="hover:bg-accent flex items-center gap-3 rounded-lg p-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      {e.city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {e.city}
                        </span>
                      )}
                      <span>{new Date(e.starts_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{e.going_count} going</Badge>
                </Link>
              ))}
              {stats.topEvents.length === 0 && (
                <p className="text-muted-foreground text-sm">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <EventFunnelCard
        rows={funnelRows}
        title={tFunnel('topByViews')}
        subtitle={tFunnel('topByViewsHelper')}
      />

      {/* Pending Reports */}
      {stats.pendingReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-red-500" />
              Pending Reports ({stats.pendingReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.pendingReports.map((r: { id: string; target_type: string; reason: string; created_at: string }) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Badge variant="outline">{r.target_type}</Badge>
                  <Badge variant="destructive">{r.reason}</Badge>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
