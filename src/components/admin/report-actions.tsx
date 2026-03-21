'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { resolveReport } from '@/lib/actions/reports';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';

interface ReportActionsProps {
  reportId: string;
}

export function ReportActions({ reportId }: ReportActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(action: 'resolved' | 'dismissed') {
    setLoading(action);
    const result = await resolveReport(reportId, action);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Report ${action}`);
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => handle('resolved')} disabled={!!loading}>
        {loading === 'resolved' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
        Resolve
      </Button>
      <Button size="sm" variant="outline" onClick={() => handle('dismissed')} disabled={!!loading}>
        {loading === 'dismissed' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />}
        Dismiss
      </Button>
    </div>
  );
}
