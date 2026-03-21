import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { getPrivacyContent } from '@/lib/legal-content';
import { LegalDocument } from '@/components/legal/legal-document';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getPrivacyContent(locale as Locale);

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/privacy',
    title: content.title,
    description: content.description,
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getPrivacyContent(locale as Locale);

  return (
    <LegalDocument
      title={content.title}
      description={content.description}
      lastUpdatedLabel={content.lastUpdatedLabel}
      effectiveDate={content.effectiveDate}
      sections={content.sections}
    />
  );
}
