import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { CreateGroupForm } from '@/components/groups/create-group-form';

export default async function CreateGroupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  const t = await getTranslations('groups.createGroup');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <CreateGroupForm />
    </div>
  );
}
