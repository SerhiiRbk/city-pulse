import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-lg font-bold">City-Pulse</h3>
            <p className="text-muted-foreground text-sm">
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
