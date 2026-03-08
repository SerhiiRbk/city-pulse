import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { getUserPhotos } from '@/lib/actions/user-photos';
import { ProfileEditForm } from '@/components/profile/profile-edit-form';

export default async function ProfileEditPage({
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

  const [interests, categories, photos] = await Promise.all([
    getInterests(),
    getInterestCategories(),
    getUserPhotos(profile.id),
  ]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Edit Profile</h1>
      <ProfileEditForm profile={profile} interests={interests} categories={categories} initialPhotos={photos} />
    </div>
  );
}
