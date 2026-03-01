'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { resetPassword } from '@/lib/actions/auth';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = { email: formData.get('email') as string };

    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const result = await resetPassword({ ...data, locale });

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="text-center text-lg font-medium">Check your email</p>
          <p className="text-muted-foreground text-center text-sm">
            We&apos;ve sent a password reset link to your email address.
          </p>
          <Button variant="ghost" asChild>
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('backToLogin')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submit')}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="ghost" asChild>
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('backToLogin')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
