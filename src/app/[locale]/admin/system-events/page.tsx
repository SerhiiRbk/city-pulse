import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Plus, MapPin, Users, ExternalLink } from 'lucide-react';

export default async function AdminSystemEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: events, count } = await supabase
    .from('events_with_counts')
    .select('id, title, status, city, going_count, starts_at, source_url', { count: 'exact' })
    .eq('is_system', true)
    .order('starts_at', { ascending: false })
    .limit(50);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>City Events ({count || 0})</CardTitle>
          <Button asChild size="sm">
            <Link href="/city-events" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Create System Event
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(events || []).length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No system events</p>
        ) : (
          <div className="space-y-2">
            {events!.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${e.id}`} className="hover:underline">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                  </Link>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="text-muted-foreground h-3 w-3 hover:text-foreground" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
