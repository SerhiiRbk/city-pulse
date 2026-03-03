import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUserManageableGroups } from '@/lib/actions/groups';
import { CreateEventForm } from '@/components/events/create-event-form';

export default async function CreateEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group_id?: string }>;
}) {
  const { locale } = await params;
  const { group_id } = await searchParams;
  setRequestLocale(locale);

  const profile = await getUserProfile();
  if (!profile) {
    redirect(`/${locale}/login`);
  }

  const [interests, categories, groups] = await Promise.all([
    getInterests(),
    getInterestCategories(),
    getUserManageableGroups(),
  ]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <CreateEventForm
        interests={interests}
        categories={categories}
        groups={groups}
        defaultGroupId={group_id}
      />
    </div>
  );
}
