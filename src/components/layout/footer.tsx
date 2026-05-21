'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';
import { SUPPORTED_CITIES } from '@/lib/cities';

// City "hubs" linked from the footer give Google an extra crawl path
// into long-tail inventory ("events in Prague", "expat groups in
// Berlin"). The slug uses the English city name for stable URLs across
// all locales. The label is localized per UI language.
// The `dbName` is the native name stored in the database `city` column.
const FOOTER_CITIES = SUPPORTED_CITIES;

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 rounded-[2rem] border border-border/50 bg-card px-6 py-8 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t('communityLabel')}</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">{t('communityTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('communityBody')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                {t('exploreEvents')}
              </Link>
              <Link
                href="/groups"
                className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('browseGroups')}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 lg:pr-8">
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('brandDescription')}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {t('brandFree')}
            </p>
            <div className="mt-4 flex gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Instagram">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Telegram">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">{t('about')}</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-foreground transition-colors">
                  {t('help')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  {t('contact')}
                </Link>
              </li>
              <li>
                <Link href="/how-to" className="hover:text-foreground transition-colors">
                  {t('howItWorks')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">
              <Link href="/cities" className="hover:text-foreground transition-colors">
                {t('cities')}
              </Link>
            </h4>
            <ul className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {FOOTER_CITIES.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/cities/${city.slug.toLowerCase().replace(/\s+/g, '-')}/events`}
                    className="hover:text-foreground transition-colors"
                  >
                    {city.labels[locale] || city.labels.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">{t('explore')}</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link href="/events" className="hover:text-foreground transition-colors">
                  {tNav('events')}
                </Link>
              </li>
              <li>
                <Link href="/groups" className="hover:text-foreground transition-colors">
                  {tNav('groups')}
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-foreground transition-colors">
                  {tNav('calendar')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  {t('privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <p className="text-muted-foreground text-center text-sm">
          {t('copyright', { year })}
        </p>
      </div>
    </footer>
  );
}
