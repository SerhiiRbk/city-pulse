import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/actions/auth';
import { getEventRaw, canEditEvent, getEventModerators } from '@/lib/actions/events';
import { getCityById } from '@/lib/actions/cities';
import { getInterests, getInterestCategories } from '@/lib/actions/profile';
import { EditEventForm } from '@/components/events/edit-event-form';
import type { Event } from '@/types/database';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Edit event');

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={null}>
      <EditEventContent locale={locale} id={id} />
    </Suspense>
  );
}

async function EditEventContent({ locale, id }: { locale: string; id: string }) {
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const event = await getEventRaw(id);
  if (!event) redirect(`/${locale}/events`);

  const allowed = await canEditEvent(id);
  if (!allowed) redirect(`/${locale}/events/${id}`);

  const [interests, categories, moderators, tEdit] = await Promise.all([
    getInterests(),
    getInterestCategories(),
    getEventModerators(id),
    getTranslations('events.edit'),
  ]);

  const initialCity = (event as any).city_id ? await getCityById((event as any).city_id) : null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{tEdit('title')}</h1>
      <EditEventForm
        event={event as Event}
        interests={interests}
        categories={categories}
        moderators={moderators as any}
        initialCity={initialCity}
      />
    </div>
  );
}
