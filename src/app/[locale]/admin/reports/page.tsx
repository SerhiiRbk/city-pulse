import { setRequestLocale } from 'next-intl/server';
import { getReports } from '@/lib/actions/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportActions } from '@/components/admin/report-actions';

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const reports = await getReports({ limit: 50 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports ({reports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No reports</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r: {
              id: string;
              target_type: string;
              target_id: string;
              reason: string;
              description: string | null;
              status: string;
              created_at: string;
              reporter: { display_name: string; avatar_url: string | null } | null;
            }) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{r.target_type}</Badge>
                  <Badge variant="destructive">{r.reason}</Badge>
                  <Badge
                    variant={
                      r.status === 'pending' ? 'secondary' :
                      r.status === 'resolved' ? 'default' :
                      'outline'
                    }
                  >
                    {r.status}
                  </Badge>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.description && (
                  <p className="text-muted-foreground mb-2 text-sm">{r.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    By: {r.reporter?.display_name || 'Unknown'}
                  </span>
                  {r.status === 'pending' && (
                    <ReportActions reportId={r.id} />
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
