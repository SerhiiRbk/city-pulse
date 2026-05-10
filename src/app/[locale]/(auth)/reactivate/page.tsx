import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ReactivationPrompt } from '@/components/account-deletion/ReactivationPrompt';

export default async function ReactivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ expiresAt?: string }>;
}) {
  const { locale } = await params;
  const { expiresAt } = await searchParams;
  setRequestLocale(locale);

  if (!expiresAt) {
    redirect(`/${locale}`);
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <ReactivationPrompt expiresAt={expiresAt} />
    </div>
  );
}
