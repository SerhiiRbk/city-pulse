import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { ContactsList } from '@/components/crew/ContactsList';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Contacts');

export default async function ProfileContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getUserProfile();

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('crew');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('contacts')}</h1>
      <ContactsList />
    </div>
  );
}
