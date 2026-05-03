'use client';

import { useState, useTransition, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CityPicker } from '@/components/ui/city-picker';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { completeOnboarding } from '@/lib/actions/onboarding';
import { cn, countryCodeToFlag } from '@/lib/utils';
import type { City, Interest, InterestCategory } from '@/types/database';

interface OnboardingWizardProps {
  initialDisplayName: string | null;
  interests: Interest[];
  categories: InterestCategory[];
  defaultCountry: string | null;
  defaultLanguages: string[];
}

type Step = 'city' | 'interests' | 'languages';

const STEP_ORDER: Step[] = ['city', 'interests', 'languages'];
const MIN_INTERESTS = 3;
const MAX_INTERESTS = 10;

export function OnboardingWizard({
  initialDisplayName,
  interests,
  categories,
  defaultCountry,
  defaultLanguages,
}: OnboardingWizardProps) {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>('city');
  const [isSaving, startTransition] = useTransition();

  const [country, setCountry] = useState<string | null>(defaultCountry);
  const [city, setCity] = useState<City | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(defaultLanguages);

  const stepIndex = STEP_ORDER.indexOf(step);

  /**
   * Group interests by category so the chooser feels like
   * "scanning a menu" rather than a flat 80-item soup. Falls back
   * to "Uncategorized" for legacy interests without a category.
   */
  const grouped = useMemo(() => {
    const orphanCategoryId = '__orphan__';
    const buckets = new Map<string, { category: InterestCategory | null; items: Interest[] }>();
    for (const cat of categories) {
      buckets.set(cat.id, { category: cat, items: [] });
    }
    buckets.set(orphanCategoryId, { category: null, items: [] });

    for (const interest of interests) {
      const bucket =
        (interest.category_id && buckets.get(interest.category_id)) ||
        buckets.get(orphanCategoryId)!;
      bucket.items.push(interest);
    }
    return Array.from(buckets.values()).filter((b) => b.items.length > 0);
  }, [interests, categories]);

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= MAX_INTERESTS
          ? prev
          : [...prev, slug],
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function next() {
    if (step === 'city') {
      if (!country || !city) {
        toast.error(t('cityRequired'));
        return;
      }
      setStep('interests');
      return;
    }
    if (step === 'interests') {
      if (selectedInterests.length < MIN_INTERESTS) {
        toast.error(t('interestsMin', { min: MIN_INTERESTS }));
        return;
      }
      setStep('languages');
      return;
    }
  }

  function back() {
    if (step === 'interests') setStep('city');
    else if (step === 'languages') setStep('interests');
  }

  function finish() {
    if (languages.length === 0) {
      toast.error(t('languagesMin'));
      return;
    }
    startTransition(async () => {
      const result = await completeOnboarding({
        city_id: city?.id ?? null,
        city_name: city?.name ?? null,
        country,
        interest_slugs: selectedInterests,
        languages,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('done'));
      router.replace('/');
      router.refresh();
    });
  }

  const greetingName = initialDisplayName?.split(' ')[0] || '';

  return (
    <Card className="w-full max-w-2xl rounded-3xl border-border/60 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">
          {greetingName ? t('titleNamed', { name: greetingName }) : t('title')}
        </CardTitle>
        <CardDescription className="mt-2">{t('subtitle')}</CardDescription>
        <div className="mt-4 flex items-center justify-center gap-2">
          {STEP_ORDER.map((s, idx) => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all',
                idx < stepIndex && 'w-8 bg-primary',
                idx === stepIndex && 'w-12 bg-primary',
                idx > stepIndex && 'w-8 bg-muted',
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 'city' && (
          <section className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('cityCountryLabel')}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={country ?? ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setCountry(value);
                    setCity(null);
                  }}
                  className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <option value="">{t('countryPlaceholder')}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryCodeToFlag(c.code)}{' '}
                      {(c as Record<string, string>)[locale] || c.en}
                    </option>
                  ))}
                </select>
                <CityPicker
                  value={city}
                  onChange={setCity}
                  countryFilter={country ?? undefined}
                  placeholder={t('cityPlaceholder')}
                  compact
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('cityHelper')}</p>
            </div>
          </section>
        )}

        {step === 'interests' && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('interestsHelper', { min: MIN_INTERESTS, max: MAX_INTERESTS })}
              </p>
              <Badge variant="secondary">
                {selectedInterests.length} / {MAX_INTERESTS}
              </Badge>
            </div>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {grouped.map(({ category, items }) => {
                const catLabel = category
                  ? category.translations?.[locale] || category.translations?.en || category.slug
                  : t('uncategorized');
                return (
                  <div key={category?.id ?? '__orphan__'}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {catLabel}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((interest) => {
                        const label =
                          interest.translations?.[locale] ||
                          interest.translations?.en ||
                          interest.slug;
                        const active = selectedInterests.includes(interest.slug);
                        const disabled =
                          !active && selectedInterests.length >= MAX_INTERESTS;
                        return (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.slug)}
                            disabled={disabled}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                              active
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:border-primary/40 hover:bg-accent',
                              disabled && 'opacity-40 cursor-not-allowed',
                            )}
                          >
                            {interest.icon && <span>{interest.icon}</span>}
                            {label}
                            {active && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === 'languages' && (
          <section className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('languagesHelper')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const label = (lang as Record<string, string>)[locale] || lang.en;
                const active = languages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-accent',
                    )}
                  >
                    {label}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 'city' || isSaving}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {tCommon('back')}
        </Button>
        {step !== 'languages' ? (
          <Button type="button" onClick={next} disabled={isSaving}>
            {tCommon('next')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={finish} disabled={isSaving || languages.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('finish')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
