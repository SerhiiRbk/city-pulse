import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { BookOpen, Mail } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { getHowToContent } from '@/lib/how-to-content';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getHowToContent(locale as Locale);

  return buildPageMetadata({
    locale: locale as Locale,
    path: '/how-to',
    title: content.title,
    description: content.description,
  });
}

export default async function HowToPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getHowToContent(locale as Locale);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: content.title, url: `/${locale}/how-to` },
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <header className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          {content.introTitle}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {content.description}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {content.introBody}
        </p>
      </header>

      {/* Table of contents */}
      <nav className="mt-8 rounded-[1.5rem] border border-border/50 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {locale === 'ru' ? 'Содержание' : locale === 'uk' ? 'Зміст' : locale === 'cs' ? 'Obsah' : locale === 'de' ? 'Inhalt' : locale === 'es' ? 'Contenido' : 'Contents'}
        </h2>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {content.sections.map((section, idx) => (
            <li key={section.title}>
              <a
                href={`#section-${idx}`}
                className="inline-flex items-baseline gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-mono text-xs text-primary/60">{String(idx + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {content.sections.map((section, idx) => (
          <section
            key={section.title}
            id={`section-${idx}`}
            className="scroll-mt-20 rounded-[1.5rem] border border-border/50 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl font-black text-primary/15">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">
          {locale === 'ru' ? 'Остались вопросы?' : locale === 'uk' ? 'Залишились питання?' : locale === 'cs' ? 'Máte další otázky?' : locale === 'de' ? 'Noch Fragen?' : locale === 'es' ? '¿Tienes más preguntas?' : 'Still have questions?'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {locale === 'ru' ? 'Напишите нам — мы всегда рады помочь.' : locale === 'uk' ? 'Напишіть нам — ми завжди раді допомогти.' : locale === 'cs' ? 'Napište nám — rádi pomůžeme.' : locale === 'de' ? 'Schreib uns — wir helfen gerne.' : locale === 'es' ? 'Escríbenos — estaremos encantados de ayudarte.' : 'Write to us — we are always happy to help.'}
        </p>
        <a
          href="mailto:info@localisio.com"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Mail className="h-4 w-4" />
          info@localisio.com
        </a>
      </div>
    </div>
  );
}
