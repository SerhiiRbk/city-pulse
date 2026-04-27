import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  SYSTEM_EVENT_TEMPLATES,
  templateToQueryString,
} from '@/lib/system-events/templates';

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Curated starter templates for editorial drafts. Static list (see
 * `templates.ts`) — clicking a card opens the composer with the template
 * defaults applied. Keeps copy/structure consistent across cities.
 */
export default async function SystemEventTemplatesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.systemEvents.templates');

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
          <Link href="/admin/system-events">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SYSTEM_EVENT_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-lg leading-none">{tpl.emoji}</span>
                {t(`items.${tpl.labelKey}` as never)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t(`items.${tpl.descriptionKey}` as never)}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link
                  href={`/admin/system-events/composer/new?${templateToQueryString(tpl)}`}
                >
                  {t('useTemplate')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
