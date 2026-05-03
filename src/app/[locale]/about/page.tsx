import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import {
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
} from '@/lib/json-ld';
import { getAboutContent } from '@/lib/about-content';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getAboutContent(locale as Locale);

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/about',
    title: content.title,
    description: content.description,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getAboutContent(locale as Locale);

  const orgJsonLd = generateOrganizationJsonLd({ description: content.description });
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: content.title, url: `/${locale}/about` },
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {content.description}
        </p>
      </header>

      <section className="mt-8 rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">{content.introTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          {content.introBody}
        </p>
      </section>

      <div className="mt-6 space-y-5">
        {content.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7"
          >
            <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {content.contactEmail}
          </p>
        </div>
        <a
          href={`mailto:${content.contactEmail}`}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Mail className="h-4 w-4" />
          {content.contactEmail}
        </a>
      </div>
    </div>
  );
}
