import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getUser } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { CreateGroupForm } from '@/components/groups/create-group-form';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Create group');

export default async function CreateGroupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  const [t, interests, categories] = await Promise.all([
    getTranslations('groups.createGroup'),
    getInterests(),
    getInterestCategories(),
  ]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <CreateGroupForm interests={interests} categories={categories} />
    </div>
  );
}
