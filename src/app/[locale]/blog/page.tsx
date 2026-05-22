import { setRequestLocale } from 'next-intl/server';
import { getAllPosts } from '@/lib/blog';
import { buildPageMetadata } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { CalendarDays, MapPin, Tag, X } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const SEO_TITLES: Record<string, string> = {
  en: 'Blog — tips for expats and community organizers',
  ru: 'Блог — советы для экспатов и организаторов',
  uk: 'Блог — поради для експатів та організаторів',
  cs: 'Blog — tipy pro expaty a organizátory',
  de: 'Blog — Tipps für Expats und Organisatoren',
  es: 'Blog — consejos para expats y organizadores',
};

const SEO_DESCS: Record<string, string> = {
  en: 'Practical guides on finding friends abroad, organizing events, language exchanges, and building community in a new city.',
  ru: 'Практические гайды о том, как найти друзей за рубежом, организовать мероприятия, языковые обмены и построить сообщество в новом городе.',
  uk: 'Практичні гайди про те, як знайти друзів за кордоном, організувати заходи, мовні обміни та побудувати спільноту в новому місті.',
  cs: 'Praktické průvodce o hledání přátel v zahraničí, organizování akcí, jazykových výměnách a budování komunity v novém městě.',
  de: 'Praktische Guides zum Finden von Freunden im Ausland, Organisieren von Events, Sprachtandems und Aufbau einer Community in einer neuen Stadt.',
  es: 'Guías prácticas sobre cómo encontrar amigos en el extranjero, organizar eventos, intercambios de idiomas y construir comunidad en una nueva ciudad.',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as Locale,
    path: '/blog',
    title: SEO_TITLES[locale] || SEO_TITLES.en,
    description: SEO_DESCS[locale] || SEO_DESCS.en,
  });
}

export default async function BlogListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);

  const allPosts = getAllPosts(locale);
  const activeTag = filters.tag || null;
  const posts = activeTag
    ? allPosts.filter((p) => p.tags.includes(activeTag))
    : allPosts;

  const PAGE_TITLES: Record<string, string> = {
    en: 'Blog',
    ru: 'Блог',
    uk: 'Блог',
    cs: 'Blog',
    de: 'Blog',
    es: 'Blog',
  };

  const PAGE_SUBTITLES: Record<string, string> = {
    en: 'Tips, guides, and stories for expats and community builders',
    ru: 'Советы, гайды и истории для экспатов и организаторов сообществ',
    uk: 'Поради, гайди та історії для експатів та організаторів спільнот',
    cs: 'Tipy, průvodce a příběhy pro expaty a organizátory komunit',
    de: 'Tipps, Guides und Geschichten für Expats und Community-Builder',
    es: 'Consejos, guías e historias para expats y constructores de comunidad',
  };

  const EMPTY_STATES: Record<string, string> = {
    en: 'No articles yet. Check back soon!',
    ru: 'Статей пока нет. Загляните позже!',
    uk: 'Статей поки немає. Загляньте пізніше!',
    cs: 'Zatím žádné články. Zkuste to později!',
    de: 'Noch keine Artikel. Schauen Sie bald wieder vorbei!',
    es: 'Aún no hay artículos. ¡Vuelve pronto!',
  };

  const RESET_LABELS: Record<string, string> = {
    en: 'Show all',
    ru: 'Показать все',
    uk: 'Показати всі',
    cs: 'Zobrazit vše',
    de: 'Alle anzeigen',
    es: 'Mostrar todos',
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {PAGE_TITLES[locale] || PAGE_TITLES.en}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {PAGE_SUBTITLES[locale] || PAGE_SUBTITLES.en}
        </p>
      </div>

      {/* Active tag filter indicator */}
      {activeTag && (
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            <Tag className="h-3.5 w-3.5" />
            {activeTag}
          </span>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {RESET_LABELS[locale] || RESET_LABELS.en}
          </Link>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-muted-foreground">{EMPTY_STATES[locale] || EMPTY_STATES.en}</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md"
            >
              <Link href={`/blog/${post.slug}`} className="flex flex-col gap-4 sm:flex-row">
                {post.image && (
                  <div className="shrink-0 overflow-hidden rounded-xl sm:w-48 sm:h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-40 w-full object-cover transition-transform group-hover:scale-105 sm:h-full"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                      {post.description}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(post.date).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {post.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {post.city}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {/* Clickable tags */}
              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-0 sm:pl-52">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${tag}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-primary/10 hover:border-primary/30 hover:text-primary ${
                        activeTag === tag
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border/60 text-muted-foreground'
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
