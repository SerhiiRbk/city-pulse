import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminBadgesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .order('id', { ascending: true });

  const { data: recentAssignments } = await supabase
    .from('user_badges')
    .select('*, badge:badge_id(slug, icon, translations), user:user_id(display_name)')
    .order('awarded_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Badge Definitions ({badges?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(badges || []).map((b: { id: number; slug: string; icon: string; translations: Record<string, { name: string; description: string }> }) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-medium">{b.translations?.en?.name || b.slug}</p>
                  <p className="text-muted-foreground text-xs">{b.translations?.en?.description || b.slug}</p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {b.slug}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {(recentAssignments || []).length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No badges assigned yet</p>
          ) : (
            <div className="space-y-2">
              {(recentAssignments || []).map((a: {
                id: string;
                awarded_at: string;
                badge: { slug: string; icon: string; translations: Record<string, { name: string }> } | null;
                user: { display_name: string } | null;
              }) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="text-xl">{a.badge?.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{a.user?.display_name || 'Unknown'}</p>
                    <p className="text-muted-foreground text-xs">{a.badge?.translations?.en?.name || a.badge?.slug}</p>
                  </div>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(a.awarded_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
