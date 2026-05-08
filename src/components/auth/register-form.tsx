'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { signUp, signInWithGoogle } from '@/lib/actions/auth';
import { registerSchema } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      displayName: formData.get('displayName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    if (!hasAcceptedTerms) {
      toast.error(t('acceptTermsError'));
      setIsLoading(false);
      return;
    }

    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const result = await signUp({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      locale,
      acceptedTerms: hasAcceptedTerms,
      redirectTo,
    });

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    router.push('/verify-email');
  }

  async function handleGoogleLogin() {
    if (!hasAcceptedTerms) {
      toast.error(t('acceptTermsError'));
      return;
    }

    setIsGoogleLoading(true);
    const result = await signInWithGoogle(locale, redirectTo);
    if (result?.error) {
      toast.error(result.error);
      setIsGoogleLoading(false);
    }
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
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              required
              disabled={isLoading}
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              disabled={isLoading}
            />
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={hasAcceptedTerms}
              onChange={(e) => setHasAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input"
              disabled={isLoading || isGoogleLoading}
              required
            />
            <span className="text-muted-foreground">
              {t('acceptTermsPrefix')}{' '}
              <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">
                {t('termsLink')}
              </Link>{' '}
              {t('acceptTermsMiddle')}{' '}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">
                {t('privacyLink')}
              </Link>
              .
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submit')}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-sm">{t('orContinueWith')}</span>
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || !hasAcceptedTerms}
        >
          {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('google')}
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          {t('hasAccount')}{' '}
          <Link
            href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'}
            className="text-primary font-medium hover:underline"
          >
            {t('signIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
