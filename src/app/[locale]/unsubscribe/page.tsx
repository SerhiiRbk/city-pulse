import { setRequestLocale, getTranslations } from 'next-intl/server';
import { unsubscribeByToken } from '@/lib/actions/email-preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Unsubscribe');

/**
 * One-click unsubscribe target reached from the footer of every
 * digest email. We process the token server-side so the user lands
 * on a confirmation page even when JavaScript is disabled (a
 * surprisingly common case in mail clients that pre-fetch links).
 */
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('unsubscribe');
  const result = token ? await unsubscribeByToken(token, 'digest') : { ok: false };

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          {result.ok ? (
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          ) : (
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          )}
          <CardTitle className="text-xl">
            {result.ok ? t('successTitle') : t('errorTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>{result.ok ? t('successBody') : t('errorBody')}</p>
          {result.ok && result.email && (
            <p className="text-xs">{t('emailLine', { email: result.email })}</p>
          )}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/settings/email">{t('manageCta')}</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/events">{t('homeCta')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
