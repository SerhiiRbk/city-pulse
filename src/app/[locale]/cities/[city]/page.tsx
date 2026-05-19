import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; city: string }>;
};

/**
 * /cities/prague → redirect to /cities/prague/events
 * This catches direct navigation to the city root URL.
 */
export default async function CityIndexPage({ params }: Props) {
  const { locale, city } = await params;
  redirect(`/${locale}/cities/${city}/events`);
}
