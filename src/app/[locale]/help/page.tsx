import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { LifeBuoy, Mail, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { buildPageMetadata } from '@/lib/seo';
import {
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
} from '@/lib/json-ld';
import { getHelpContent } from '@/lib/help-content';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getHelpContent(locale as Locale);

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/help',
    title: content.title,
    description: content.description,
  });
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getHelpContent(locale as Locale);

  // Flatten paragraphs into a single answer string for the JSON-LD —
  // Schema.org `Answer` accepts plain text and Google strips HTML when
  // rendering FAQ rich snippets anyway.
  const faqJsonLd = generateFaqJsonLd(
    content.faqs.map((faq) => ({
      question: faq.question,
      answer: faq.paragraphs.join(' '),
    })),
  );
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: content.title, url: `/${locale}/help` },
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
          <LifeBuoy className="h-3.5 w-3.5" />
          {content.introTitle}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {content.description}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {content.introBody}
        </p>
        <Link
          href="/how-to"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {locale === 'ru' ? 'Подробнее о возможностях' : locale === 'uk' ? 'Детальніше про можливості' : locale === 'cs' ? 'Více o funkcích' : locale === 'de' ? 'Mehr über die Funktionen' : locale === 'es' ? 'Más sobre las funciones' : 'Learn more about features'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="mt-8 space-y-4">
        {content.faqs.map((faq, idx) => (
          <details
            key={faq.question}
            className="group rounded-[1.5rem] border border-border/50 bg-card p-5 shadow-sm transition-all open:shadow-md sm:p-6"
            open={idx === 0}
          >
            <summary className="flex cursor-pointer items-start justify-between gap-4 text-base font-semibold tracking-tight marker:hidden">
              <span>{faq.question}</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="mt-3 space-y-2.5 text-sm leading-7 text-muted-foreground sm:text-base">
              {faq.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">{content.contactCta.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {content.contactCta.body}
        </p>
        <a
          href={`mailto:${content.contactCta.email}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Mail className="h-4 w-4" />
          {content.contactCta.email}
        </a>
      </div>
    </div>
  );
}
