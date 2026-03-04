import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-black shadow-sm">
                CP
              </div>
              <span className="text-xl font-extrabold tracking-tight">City-Pulse</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Social platform for offline communities of expats and locals.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">{t('about')}</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t('howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Legal</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t('privacy')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Explore</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link href="/events" className="hover:text-foreground transition-colors">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/groups" className="hover:text-foreground transition-colors">
                  Groups
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-foreground transition-colors">
                  Calendar
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
