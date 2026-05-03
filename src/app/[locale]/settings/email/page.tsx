import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailPreferencesForm } from '@/components/settings/email-preferences-form';
import { PushToggle } from '@/components/settings/push-toggle';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Email preferences');

/**
 * "Manage email preferences" landing page. Surfaces the digest
 * toggle today; future categories (reminders, marketing) plug into
 * the same form.
 */
export default async function EmailSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/settings/email`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_digest_enabled, email')
    .eq('id', user.id)
    .single();

  const t = await getTranslations('settings.email');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-muted-foreground">
            {t('emailLabel', { email: profile?.email || '' })}
          </p>
          <EmailPreferencesForm
            initialDigestEnabled={profile?.email_digest_enabled ?? true}
          />
          <PushToggle
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
