'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import {
  fetchOpenGraphFromUrl,
  publishSystemEvent,
  saveSystemEventDraft,
  type ComposerInput,
} from '@/lib/actions/system-events-editorial';
import {
  hasBlockingGate,
  runQualityGates,
  type QualityGate,
} from '@/lib/system-events/quality-gates';
import { QualityGatesPanel } from './quality-gates-panel';

interface Category {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
}

interface ComposerInitial {
  id?: string;
  title: string;
  description: string;
  editorial_pitch: string;
  source_url: string;
  partner_name: string;
  partner_url: string;
  category_id: string;
  starts_at: string;
  duration_minutes: number;
  city: string;
  address: string;
  is_free: boolean;
  price: number | null;
  currency: string;
  cover_url: string;
  editorial_status: 'draft' | 'review' | 'scheduled' | 'published';
}

interface SystemEventComposerProps {
  initial: ComposerInitial;
  categories: Category[];
}

const DEFAULT_DURATION = 120;

export function SystemEventComposer({ initial, categories }: SystemEventComposerProps) {
  const t = useTranslations('admin.systemEvents.composer');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [importing, startImport] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverGates, setServerGates] = useState<QualityGate[] | null>(null);

  const [form, setForm] = useState(initial);

  /**
   * Quality gates are recomputed on every keystroke. The function is pure
   * so we keep it in `useMemo` to avoid reallocating arrays on each render
   * — the gates list is consumed by the side panel and the publish guard.
   */
  const gates = useMemo<QualityGate[]>(
    () =>
      runQualityGates({
        title: form.title,
        description: form.description,
        editorial_pitch: form.editorial_pitch,
        starts_at: form.starts_at,
        cover_url: form.cover_url,
        city: form.city,
        category_id: form.category_id,
        partner_name: form.partner_name,
      }),
    [form],
  );

  function update<K extends keyof ComposerInitial>(key: K, value: ComposerInitial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImport() {
    if (!form.source_url) return;
    setImportError(null);
    startImport(async () => {
      const res = await fetchOpenGraphFromUrl(form.source_url);
      if (res.error) {
        setImportError(t(`importError.${res.error}`));
        return;
      }
      setForm((prev) => ({
        ...prev,
        title: prev.title || res.title || '',
        description: prev.description || res.description || '',
        cover_url: prev.cover_url || res.image || '',
      }));
    });
  }

  function buildPayload(target: ComposerInitial['editorial_status']): ComposerInput & { id?: string } {
    return {
      id: form.id,
      title: form.title.trim(),
      description: form.description.trim(),
      editorial_pitch: form.editorial_pitch.trim(),
      source_url: form.source_url.trim() || null,
      partner_name: form.partner_name.trim() || null,
      partner_url: form.partner_url.trim() || null,
      category_id: form.category_id,
      starts_at: form.starts_at,
      duration_minutes: form.duration_minutes || DEFAULT_DURATION,
      city: form.city.trim(),
      address: form.address.trim() || null,
      is_free: form.is_free,
      price: form.is_free ? null : form.price,
      currency: form.is_free ? null : form.currency || 'EUR',
      photos: form.cover_url ? [form.cover_url] : [],
      editorial_status: target,
    };
  }

  function handleSave(target: ComposerInitial['editorial_status']) {
    setSaveError(null);
    setServerGates(null);
    startTransition(async () => {
      const payload = buildPayload(target);
      const saveRes = await saveSystemEventDraft(payload);
      if (saveRes.error) {
        setSaveError(saveRes.error);
        return;
      }
      const newId = saveRes.eventId!;

      if (target === 'published') {
        const publishRes = await publishSystemEvent(newId);
        if ('error' in publishRes && publishRes.error) {
          setSaveError(publishRes.error);
          if (publishRes.gates) setServerGates(publishRes.gates);
          return;
        }
      }

      router.push(`/admin/system-events/composer/${newId}`);
      router.refresh();
    });
  }

  const blocked = hasBlockingGate(gates);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        {/* Source quick-import. Sits on top so editors paste a partner URL
            and get a usable draft in two clicks. */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              {t('sourceTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={form.source_url}
                onChange={(e) => update('source_url', e.target.value)}
                placeholder={t('sourceUrlPlaceholder')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImport}
                disabled={!form.source_url || importing}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t('importButton')}
              </Button>
            </div>
            {importError && <p className="text-sm text-destructive">{importError}</p>}
            <p className="text-xs text-muted-foreground">{t('sourceHint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('basicsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">{t('titleLabel')}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder={t('titlePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="pitch">{t('pitchLabel')}</Label>
              <Textarea
                id="pitch"
                value={form.editorial_pitch}
                onChange={(e) => update('editorial_pitch', e.target.value)}
                placeholder={t('pitchPlaceholder')}
                rows={2}
                maxLength={300}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('pitchHint', { length: form.editorial_pitch.length })}
              </p>
            </div>
            <div>
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="cover">{t('coverLabel')}</Label>
              <Input
                id="cover"
                value={form.cover_url}
                onChange={(e) => update('cover_url', e.target.value)}
                placeholder={t('coverPlaceholder')}
              />
              {form.cover_url && (
                // Cover preview gives editors instant feedback without round-tripping.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.cover_url}
                  alt=""
                  className="mt-2 h-32 w-full rounded-lg border object-cover"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('whenTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="starts_at">{t('startsAtLabel')}</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={toLocalInput(form.starts_at)}
                  onChange={(e) => update('starts_at', fromLocalInput(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="duration">{t('durationLabel')}</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  step={15}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    update('duration_minutes', Number(e.target.value) || DEFAULT_DURATION)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('whereTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="city">{t('cityLabel')}</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={t('cityPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="address">{t('addressLabel')}</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder={t('addressPlaceholder')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('curationTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="category">{t('categoryLabel')}</Label>
              <Select
                value={form.category_id || undefined}
                onValueChange={(value) => update('category_id', value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="partner">{t('partnerNameLabel')}</Label>
                <Input
                  id="partner"
                  value={form.partner_name}
                  onChange={(e) => update('partner_name', e.target.value)}
                  placeholder={t('partnerNamePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="partner_url">{t('partnerUrlLabel')}</Label>
                <Input
                  id="partner_url"
                  value={form.partner_url}
                  onChange={(e) => update('partner_url', e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is_free" className="font-medium">
                  {t('freeLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('freeHint')}</p>
              </div>
              <Switch
                id="is_free"
                checked={form.is_free}
                onCheckedChange={(v) => update('is_free', v)}
              />
            </div>
            {!form.is_free && (
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div>
                  <Label htmlFor="price">{t('priceLabel')}</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price ?? ''}
                    onChange={(e) =>
                      update('price', e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="currency">{t('currencyLabel')}</Label>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(e) => update('currency', e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <QualityGatesPanel gates={serverGates ?? gates} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('actionsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('currentStatusLabel')}</span>
              <Badge variant="outline">{t(`status.${form.editorial_status}`)}</Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => handleSave('draft')}
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('saveDraftButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => handleSave('review')}
            >
              {t('sendToReviewButton')}
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={pending || blocked}
              onClick={() => handleSave('published')}
            >
              {t('publishButton')}
            </Button>
            {blocked && (
              <p className="text-xs text-amber-600">{t('publishBlockedHint')}</p>
            )}
            {saveError && (
              <p className="text-xs text-destructive">
                {/* Server-side errors are returned as raw codes (e.g.
                    `quality_gates_failed`) — the panel above already lists
                    the offending fields, so we keep this message short. */}
                {saveError === 'quality_gates_failed'
                  ? t('publishGatesFailed')
                  : saveError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * `<input type="datetime-local">` insists on a timezone-naive string, so
 * we keep the database in ISO/UTC and only translate at the edge.
 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}
