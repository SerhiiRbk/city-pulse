import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SystemEventComposer } from '@/components/admin/system-events/system-event-composer';
import { SYSTEM_EVENT_TEMPLATES } from '@/lib/system-events/templates';

const NEW_DRAFT_ID = 'new';

const DEFAULT_DURATION = 120;

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ template?: string }>;
}

/**
 * Single composer page that handles both creation (`/composer/new`) and
 * editing (`/composer/<uuid>`). Categories are fetched once and threaded
 * into the client component to avoid a second round-trip from the form.
 *
 * Auth is enforced by the parent admin layout — we still return notFound
 * for non-admin lookups of unknown IDs to avoid leaking row existence.
 */
export default async function SystemEventComposerPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, id } = await params;
  const { template: templateId } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const t = await getTranslations('admin.systemEvents.composer');

  const [categoriesRes, draftRes] = await Promise.all([
    supabase
      .from('interest_categories')
      .select('id, slug, name, icon')
      .order('sort_order', { ascending: true }),
    id === NEW_DRAFT_ID
      ? Promise.resolve({ data: null })
      : supabase
          .from('events')
          .select(
            'id, title, description, editorial_pitch, source_url, partner_name, partner_url, category_id, starts_at, duration_minutes, city, address, is_free, price, currency, photos, editorial_status, is_system',
          )
          .eq('id', id)
          .eq('is_system', true)
          .maybeSingle(),
  ]);

  if (id !== NEW_DRAFT_ID && !draftRes?.data) {
    notFound();
  }

  const draft = draftRes?.data;
  // Templates only seed brand-new drafts. We never overwrite an existing
  // row's fields just because the editor revisited the URL with `?template=`.
  const template =
    !draft && templateId
      ? SYSTEM_EVENT_TEMPLATES.find((t) => t.id === templateId)
      : undefined;

  const initial = {
    id: draft?.id,
    title: draft?.title ?? template?.defaults.title ?? '',
    description: draft?.description ?? template?.defaults.description ?? '',
    editorial_pitch: draft?.editorial_pitch ?? template?.defaults.pitch ?? '',
    source_url: draft?.source_url ?? '',
    partner_name: draft?.partner_name ?? '',
    partner_url: draft?.partner_url ?? '',
    category_id: draft?.category_id ?? '',
    starts_at: draft?.starts_at ?? '',
    duration_minutes:
      draft?.duration_minutes ?? template?.defaults.duration_minutes ?? DEFAULT_DURATION,
    city: draft?.city ?? '',
    address: draft?.address ?? '',
    is_free: draft?.is_free ?? template?.defaults.is_free ?? true,
    price: draft?.price ?? null,
    currency: draft?.currency ?? 'EUR',
    cover_url: (draft?.photos ?? [])[0] ?? '',
    editorial_status:
      ((draft?.editorial_status ?? 'draft') as
        | 'draft'
        | 'review'
        | 'scheduled'
        | 'published'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link href="/admin/system-events">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('backToDashboard')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {draft ? t('titleEdit') : t('titleNew')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {draft?.id && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${draft.id}`} target="_blank">
              <ExternalLink className="mr-1 h-4 w-4" />
              {t('viewLive')}
            </Link>
          </Button>
        )}
      </div>

      <SystemEventComposer
        initial={initial}
        categories={(categoriesRes.data ?? []).map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          icon: c.icon,
        }))}
      />
    </div>
  );
}
