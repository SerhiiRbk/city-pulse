'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { reactivateAccount, declineReactivation } from '@/lib/actions/account-deletion';

interface ReactivationPromptProps {
  expiresAt: string;
}

/**
 * Shown after login when the user has an active deletion request.
 * Offers two options: reactivate the account or keep it deleted.
 *
 * Requirements: 2.4, 2.5, 2.6, 11.1
 */
export function ReactivationPrompt({ expiresAt }: ReactivationPromptProps) {
  const t = useTranslations('accountDeletion');
  const locale = useLocale();
  const router = useRouter();

  const [reactivating, setReactivating] = useState(false);
  const [declining, setDeclining] = useState(false);

  const formattedDate = new Date(expiresAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  async function handleReactivate() {
    setReactivating(true);
    try {
      const result = await reactivateAccount();
      if (result.success) {
        router.push('/');
        router.refresh();
      }
    } finally {
      setReactivating(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    try {
      const result = await declineReactivation();
      if (result.success) {
        router.push('/login');
        router.refresh();
      }
    } finally {
      setDeclining(false);
    }
  }

  const isLoading = reactivating || declining;

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{t('reactivation.title')}</CardTitle>
        <CardDescription>{t('reactivation.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t('reactivation.gracePeriodEnds', { date: formattedDate })}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleReactivate}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {reactivating && <Loader2 className="animate-spin" />}
          {t('reactivation.confirm')}
        </Button>
        <Button
          variant="outline"
          onClick={handleDecline}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {declining && <Loader2 className="animate-spin" />}
          {t('reactivation.decline')}
        </Button>
      </CardFooter>
    </Card>
  );
}
