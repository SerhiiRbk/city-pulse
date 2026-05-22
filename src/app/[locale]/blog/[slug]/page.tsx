import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug, getAllPosts, markdownToHtml } from '@/lib/blog';
import { buildPageMetadata } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/config';
import { SITE_URL } from '@/lib/constants';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CalendarDays, MapPin, Tag } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map(({ locale, slug }) => ({ locale, slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale, slug);

  if (!post) {
    return { title: 'Not Found' };
  }

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/blog/${slug}`,
    title: post.title,
    description: post.description,
    image: post.image,
    type: 'article',
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getPostBySlug(locale, slug);
  if (!post) notFound();

  const htmlContent = await markdownToHtml(post.content);

  // Get related posts (same locale, exclude current)
  const allPosts = getAllPosts(locale);
  const relatedPosts = allPosts.filter((p) => p.slug !== slug).slice(0, 3);

  const BACK_LABELS: Record<string, string> = {
    en: 'Back to blog',
    ru: 'Назад в блог',
    uk: 'Назад до блогу',
    cs: 'Zpět na blog',
    de: 'Zurück zum Blog',
    es: 'Volver al blog',
  };

  const RELATED_LABELS: Record<string, string> = {
    en: 'Related articles',
    ru: 'Читайте также',
    uk: 'Читайте також',
    cs: 'Související články',
    de: 'Verwandte Artikel',
    es: 'Artículos relacionados',
  };

  // Schema.org Article JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: 'Localisio',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Localisio',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${locale}/blog/${slug}`,
    },
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {BACK_LABELS[locale] || BACK_LABELS.en}
      </Link>

      {/* Article header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {post.city && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {post.city}
            </span>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Cover image */}
      {post.image && (
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img
            src={post.image}
            alt={post.title}
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      )}

      {/* Article content */}
      <article
        className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <h2 className="mb-6 text-xl font-semibold">
            {RELATED_LABELS[locale] || RELATED_LABELS.en}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="group rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
              >
                {related.image && (
                  <div className="mb-3 overflow-hidden rounded-lg">
                    <img
                      src={related.image}
                      alt={related.title}
                      className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <h3 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {related.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(related.date).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
