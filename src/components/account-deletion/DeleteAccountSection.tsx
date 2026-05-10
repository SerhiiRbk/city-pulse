'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DeletionConfirmationDialog } from './DeletionConfirmationDialog';

interface DeleteAccountSectionProps {
  hasPendingDeletion: boolean;
}

export function DeleteAccountSection({ hasPendingDeletion }: DeleteAccountSectionProps) {
  const t = useTranslations('accountDeletion');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">
          {t('dangerZone.title')}
        </CardTitle>
        <CardDescription>
          {t('dangerZone.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasPendingDeletion ? (
          <p className="text-sm text-muted-foreground">
            {t('dangerZone.pendingMessage')}
          </p>
        ) : (
          <>
            <Button
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              <Trash2 />
              {t('deleteButton')}
            </Button>
            <DeletionConfirmationDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
