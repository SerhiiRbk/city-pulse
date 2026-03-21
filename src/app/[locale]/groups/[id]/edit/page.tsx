import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { canEditGroup, getGroupRaw, getGroupMembers, getGroupInterests } from '@/lib/actions/groups';
import { getCityById } from '@/lib/actions/cities';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { EditGroupForm } from '@/components/groups/edit-group-form';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Edit group');

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditGroupPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  const canEdit = await canEditGroup(id);
  if (!canEdit) redirect({ href: `/groups/${id}`, locale });

  const [group, members, interests, categories, groupInterestIds] = await Promise.all([
    getGroupRaw(id),
    getGroupMembers(id),
    getInterests(),
    getInterestCategories(),
    getGroupInterests(id),
  ]);

  if (!group) notFound();

  const initialCity = group.city_id ? await getCityById(group.city_id) : null;
  const t = await getTranslations('groups.editGroup');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <EditGroupForm
        group={group}
        members={members}
        interests={interests}
        categories={categories}
        groupInterestIds={groupInterestIds}
        initialCity={initialCity}
      />
    </div>
  );
}
