import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUser, getUserProfile } from '@/lib/actions/auth';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { OnboardingWizard } from '@/components/auth/onboarding-wizard';
import { buildNoIndexMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export const metadata = buildNoIndexMetadata('Onboarding');

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    redirect({ href: '/login', locale: locale as Locale });
    return null;
  }

  const profile = await getUserProfile();
  if (profile?.onboarded_at) {
    // Already onboarded — kick them to the home page so the wizard
    // can never be reopened by deep-linking.
    redirect({ href: '/', locale: locale as Locale });
    return null;
  }

  const [interests, categories] = await Promise.all([
    getInterests(),
    getInterestCategories(),
  ]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <OnboardingWizard
        initialDisplayName={profile?.display_name ?? null}
        interests={interests}
        categories={categories}
        defaultCountry={profile?.country ?? null}
        defaultLanguages={profile?.languages ?? []}
      />
    </div>
  );
}
