import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Mail, Send } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';

const CONTACT_EMAIL = 'info@localisio.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/contact',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('contact');
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('title'), url: `/${locale}/contact` },
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>
      </header>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{t('emailTitle')}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t('emailBody')}</p>
          <p className="mt-3 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {CONTACT_EMAIL}
          </p>
        </a>

        <Link
          href="/help"
          className="group rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <Send className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{t('faqTitle')}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t('faqBody')}</p>
          <p className="mt-3 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {t('faqCta')}
          </p>
        </Link>
      </div>

      <section className="mt-8 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">{t('replyTimeTitle')}</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">{t('replyTimeBody')}</p>
      </section>
    </div>
  );
}
