'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface DeletionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Deletion confirmation dialog placeholder.
 * Full implementation (confirmation word input, validation, submission) in task 10.2.
 */
export function DeletionConfirmationDialog({
  open,
  onOpenChange,
}: DeletionConfirmationDialogProps) {
  const t = useTranslations('accountDeletion');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.consequences')}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
