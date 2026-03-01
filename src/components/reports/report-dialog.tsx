'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Flag, Loader2 } from 'lucide-react';
import { createReport, type ReportReason, type TargetType } from '@/lib/actions/reports';
import { toast } from 'sonner';

interface ReportDialogProps {
  targetType: TargetType;
  targetId: string;
}

const REASONS: ReportReason[] = ['spam', 'harassment', 'inappropriate', 'fake', 'other'];

export function ReportDialog({ targetType, targetId }: ReportDialogProps) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);

    const result = await createReport({
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description.trim() || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('submitted'));
      setOpen(false);
      setReason(null);
      setDescription('');
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="mr-1 h-3.5 w-3.5" />
          {t('report')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('reason')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant={reason === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReason(r)}
                >
                  {t(`reasons.${r}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('details')}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t('detailsPlaceholder')}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
          <Button onClick={handleSubmit} disabled={!reason || loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
