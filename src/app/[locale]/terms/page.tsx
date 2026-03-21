import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import { getTermsContent } from '@/lib/legal-content';
import { LegalDocument } from '@/components/legal/legal-document';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getTermsContent(locale as Locale);

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/terms',
    title: content.title,
    description: content.description,
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('footer');
  const content = getTermsContent(locale as Locale);

  return (
    <LegalDocument
      title={content.title}
      description={content.description}
      lastUpdatedLabel={content.lastUpdatedLabel || t('terms')}
      effectiveDate={content.effectiveDate}
      sections={content.sections}
    />
  );
}
