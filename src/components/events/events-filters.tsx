'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, X, ChevronsUpDown, Check, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { CityPicker } from '@/components/ui/city-picker';
import { SAFETY_TAGS, type SafetyTag } from '@/types/database';
import type { Interest, InterestCategory, City } from '@/types/database';

interface EventsFiltersProps {
  interests: Interest[];
  categories: InterestCategory[];
  /** Pre-resolved city object so the picker shows a label on first
   *  render (e.g. from geo-detection or profile city). */
  initialCity?: City | null;
  currentFilters: {
    city?: string;
    city_id?: string;
    country?: string;
    category?: string;
    language?: string;
    date_from?: string;
    date_to?: string;
    is_free?: string;
    is_online?: string;
    when?: string;
    q?: string;
    /** Comma-separated list of safety_tag slugs from the URL. */
    safety?: string;
  };
}

function getDateRange(when: string): { from: string; to?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (when) {
    case 'today':
      return { from: fmt(now), to: fmt(now) };
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return { from: fmt(d), to: fmt(d) };
    }
    case 'weekend': {
      const fri = new Date(now);
      fri.setDate(fri.getDate() + ((5 - fri.getDay() + 7) % 7));
      const sun = new Date(fri);
      sun.setDate(sun.getDate() + 2);
      return { from: fmt(fri), to: fmt(sun) };
    }
    case 'next_weekend': {
      const fri = new Date(now);
      fri.setDate(fri.getDate() + ((5 - fri.getDay() + 7) % 7) + 7);
      const sun = new Date(fri);
      sun.setDate(sun.getDate() + 2);
      return { from: fmt(fri), to: fmt(sun) };
    }
    case 'next_week': {
      const mon = new Date(now);
      mon.setDate(mon.getDate() + ((1 - mon.getDay() + 7) % 7 || 7));
      const sunEnd = new Date(mon);
      sunEnd.setDate(sunEnd.getDate() + 6);
      return { from: fmt(mon), to: fmt(sunEnd) };
    }
    default:
      return { from: '' };
  }
}

export function EventsFilters({ interests, categories, initialCity, currentFilters }: EventsFiltersProps) {
  const t = useTranslations('events.filters');
  const tSafety = useTranslations('events.safety');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity ?? null);
  const [rangeFrom, setRangeFrom] = useState(currentFilters.when === 'range' ? (currentFilters.date_from || '') : '');
  const [rangeTo, setRangeTo] = useState(currentFilters.when === 'range' ? (currentFilters.date_to || '') : '');
  const [searchQuery, setSearchQuery] = useState(currentFilters.q ?? '');

  const selectedCategories = currentFilters.category
    ? currentFilters.category.split(',').filter(Boolean)
    : [];
  const selectedLanguages = currentFilters.language
    ? currentFilters.language.split(',').filter(Boolean)
    : [];
  const selectedSafetyTags: SafetyTag[] = currentFilters.safety
    ? (currentFilters.safety
        .split(',')
        .filter((tag): tag is SafetyTag => (SAFETY_TAGS as readonly string[]).includes(tag)))
    : [];

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations['en'] || interest.slug;
  }

  function getCategoryLabel(cat: InterestCategory): string {
    return cat.translations[locale] || cat.translations['en'] || cat.slug;
  }

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function applyFilter(key: string, value: string | undefined) {
    applyFilters({ [key]: value });
  }

  function toggleCategory(id: string) {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    applyFilter('category', next.length > 0 ? next.join(',') : undefined);
  }

  function toggleSafetyTag(tag: SafetyTag) {
    const next = selectedSafetyTags.includes(tag)
      ? selectedSafetyTags.filter((t) => t !== tag)
      : [...selectedSafetyTags, tag];
    applyFilter('safety', next.length > 0 ? next.join(',') : undefined);
  }

  function getLanguageLabel(code: string) {
    const language = LANGUAGES.find((item) => item.code === code);
    if (!language) return code;
    return language[locale as keyof typeof language] || language.en;
  }

  function toggleLanguage(code: string) {
    const next = selectedLanguages.includes(code)
      ? selectedLanguages.filter((item) => item !== code)
      : [...selectedLanguages, code];
    applyFilter('language', next.length > 0 ? next.join(',') : undefined);
  }

  function clearFilters() {
    router.push(pathname);
  }

  function selectWhenPreset(preset: string) {
    if (preset === 'any') {
      setRangeFrom('');
      setRangeTo('');
      applyFilters({ when: undefined, date_from: undefined, date_to: undefined });
    } else {
      const { from, to } = getDateRange(preset);
      setRangeFrom('');
      setRangeTo('');
      applyFilters({ when: preset, date_from: from, date_to: to || undefined });
    }
    setWhenOpen(false);
  }

  function applyDateRange() {
    applyFilters({
      when: 'range',
      date_from: rangeFrom || undefined,
      date_to: rangeTo || undefined,
    });
    setWhenOpen(false);
  }

  function handleSearch() {
    applyFilters({
      city_id: selectedCity?.id || undefined,
      city: selectedCity?.name || undefined,
    });
  }

  function applyTextSearch() {
    const trimmed = searchQuery.trim();
    applyFilter('q', trimmed.length > 0 ? trimmed : undefined);
  }

  const hasFilters = Object.values(currentFilters).some(Boolean);

  const uncategorizedCatId = categories.find((c) => c.slug === 'other')?.id;
  const groupedInterests = categories
    .map((cat) => ({
      ...cat,
      label: getCategoryLabel(cat),
      items: interests.filter((i) => {
        if (i.category_id) return i.category_id === cat.id;
        return cat.id === uncategorizedCatId;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const controlTrigger = 'h-10 sm:h-11 w-full rounded-xl border-border/70 bg-background/92 text-foreground shadow-sm hover:bg-muted/70 hover:text-foreground [&>svg]:text-muted-foreground';
  const whenLabels = {
    today: t('today'),
    tomorrow: t('tomorrow'),
    weekend: t('weekendLong'),
    next_weekend: t('nextWeekend'),
    next_week: t('nextWeek'),
  } as const;

  const whenLabel = currentFilters.when === 'range' && (currentFilters.date_from || currentFilters.date_to)
    ? `${currentFilters.date_from || '...'} — ${currentFilters.date_to || '...'}`
    : currentFilters.when && whenLabels[currentFilters.when as keyof typeof whenLabels]
      ? whenLabels[currentFilters.when as keyof typeof whenLabels]
      : null;
  const whenRangeHint = currentFilters.when === 'range' && whenLabel ? whenLabel : null;
  const interestsHint = selectedCategories.length > 0
    ? selectedCategories
        .map((id) => interests.find((interest) => interest.id === id))
        .filter(Boolean)
        .map((interest) => getInterestLabel(interest as Interest))
        .join(', ')
    : null;
  const languagesHint = selectedLanguages.length > 0
    ? selectedLanguages.map((code) => getLanguageLabel(code)).join(', ')
    : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyTextSearch();
            }
          }}
          onBlur={applyTextSearch}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="bg-background/95 h-10 rounded-xl pl-9 pr-9 text-sm shadow-sm sm:h-11"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              applyFilter('q', undefined);
            }}
            aria-label={t('clearSearch')}
            className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
        {[
          { key: 'today', label: t('today') },
          { key: 'tomorrow', label: t('tomorrow') },
          { key: 'weekend', label: t('weekendLong') },
          { key: 'next_weekend', label: t('nextWeekend') },
          { key: 'next_week', label: t('nextWeek') },
        ].map((preset) => {
          const active = currentFilters.when === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => selectWhenPreset(preset.key)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium shadow-sm transition-colors sm:text-sm',
                active
                  ? 'border-primary/30 bg-primary text-primary-foreground'
                  : 'border-border/70 bg-background/90 text-foreground hover:bg-muted/70',
              )}
            >
              {preset.label}
            </button>
          );
        })}
        </div>
      </div>

      {/*
       * Safety chips: comma-separated `safety` URL param. Treated as
       * AND-filter (event must have ALL selected tags). Vocabulary
       * mirrors `SAFETY_TAGS` in @/types/database.
       */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-2">
          {SAFETY_TAGS.map((tag) => {
            const active = selectedSafetyTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSafetyTag(tag)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium shadow-sm transition-colors sm:text-[13px]',
                  active
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border/70 bg-background/90 text-foreground hover:bg-muted/70',
                )}
                aria-pressed={active}
              >
                {tSafety(`tag.${tag}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.95fr)_auto]">
        {/* Country */}
        <div>
          <Select
            value={currentFilters.country || ''}
            onValueChange={(val) => applyFilter('country', val === '_all' ? undefined : val)}
          >
            <SelectTrigger className={controlTrigger}>
              <SelectValue placeholder={t('country')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('allCountries')}</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {countryCodeToFlag(c.code)} {(c as Record<string, string>)[locale] || c.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div>
          <CityPicker
            value={selectedCity}
            onChange={(city) => {
              setSelectedCity(city);
              if (city) {
                applyFilters({ city_id: city.id, city: city.name });
              } else {
                applyFilters({ city_id: undefined, city: undefined });
              }
            }}
            countryFilter={currentFilters.country || undefined}
            placeholder={t('city')}
            compact
          />
        </div>

        {/* Interests */}
        <div>
          <Popover open={interestsOpen} onOpenChange={setInterestsOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      title={interestsHint || undefined}
                      className={cn(controlTrigger, 'justify-between font-normal')}
                    >
                      {selectedCategories.length > 0 ? (
                        <span className="truncate">{t('selectedCount', { count: selectedCategories.length })}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('interests')}</span>
                      )}
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                {interestsHint && (
                  <TooltipContent side="top" sideOffset={8} className="max-w-sm">
                    {interestsHint}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-2" align="start">
              {groupedInterests.map((group) => (
                <div key={group.id} className="mb-2 last:mb-0">
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-semibold uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((interest) => {
                    const selected = selectedCategories.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        className={cn(
                          'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                          selected && 'bg-accent',
                        )}
                        onClick={() => toggleCategory(interest.id)}
                      >
                        <Check className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                        {interest.icon && <span className="text-base leading-none">{interest.icon}</span>}
                        {getInterestLabel(interest)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Languages */}
        <div>
          <Popover open={languagesOpen} onOpenChange={setLanguagesOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      title={languagesHint || undefined}
                      className={cn(controlTrigger, 'justify-between font-normal')}
                    >
                      {selectedLanguages.length > 0 ? (
                        <span className="truncate">{t('selectedCount', { count: selectedLanguages.length })}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('language')}</span>
                      )}
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                {languagesHint && (
                  <TooltipContent side="top" sideOffset={8} className="max-w-sm">
                    {languagesHint}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-2" align="start">
              {LANGUAGES.map((language) => {
                const selected = selectedLanguages.includes(language.code);
                return (
                  <button
                    key={language.code}
                    type="button"
                    className={cn(
                      'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      selected && 'bg-accent',
                    )}
                    onClick={() => toggleLanguage(language.code)}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="text-base leading-none">{countryCodeToFlag(language.flag)}</span>
                    {getLanguageLabel(language.code)}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>

        {/* When — Popover with presets + date range */}
        <div>
          <Popover open={whenOpen} onOpenChange={setWhenOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      title={whenRangeHint || undefined}
                      className={cn(controlTrigger, 'justify-between font-normal')}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
                        {whenLabel ? (
                          <span className="truncate text-foreground">{whenLabel}</span>
                        ) : (
                          <span className="text-muted-foreground">{t('when')}</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                {whenRangeHint && (
                  <TooltipContent side="top" sideOffset={8}>
                    {whenRangeHint}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-72 p-0" align="start">
              {/* Presets */}
              <div className="border-b p-1">
                {(['any', 'today', 'tomorrow', 'weekend', 'next_weekend', 'next_week'] as const).map((preset) => {
                  const active = preset === 'any'
                    ? !currentFilters.when
                    : currentFilters.when === preset;
                  const label = preset === 'any' ? t('anyTime') : whenLabels[preset];
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={cn(
                        'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
                        active && 'bg-accent font-medium',
                      )}
                      onClick={() => selectWhenPreset(preset)}
                    >
                      <Check className={cn('h-4 w-4 shrink-0', active ? 'opacity-100' : 'opacity-0')} />
                      {label}
                    </button>
                  );
                })}
              </div>
              {/* Date range */}
              <div className="space-y-3 p-3">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{t('dateRange')}</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-[11px]">{t('from')}</label>
                    <Input
                      type="date"
                      className="h-11"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-[11px]">{t('to')}</label>
                    <Input
                      type="date"
                      className="h-11"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="h-11 w-full"
                  disabled={!rangeFrom && !rangeTo}
                  onClick={applyDateRange}
                >
                  {t('applyRange')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Status */}
        <div>
          <Select
            value={
              currentFilters.is_free === 'true' ? 'free'
                : currentFilters.is_online === 'true' ? 'online'
                  : currentFilters.is_online === 'false' ? 'offline'
                    : ''
            }
            onValueChange={(val) => {
              const updates: Record<string, string | undefined> = { is_free: undefined, is_online: undefined };
              if (val === 'free') updates.is_free = 'true';
              else if (val === 'online') updates.is_online = 'true';
              else if (val === 'offline') updates.is_online = 'false';
              applyFilters(updates);
            }}
          >
            <SelectTrigger className={controlTrigger}>
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('all')}</SelectItem>
              <SelectItem value="free">{t('free')}</SelectItem>
              <SelectItem value="online">{t('online')}</SelectItem>
              <SelectItem value="offline">{t('offline')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search button */}
        <Button className="h-10 w-full rounded-xl px-6 font-semibold shadow-md sm:h-11 xl:w-auto" onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          {t('searchCta')}
        </Button>
      </div>

      {/* Selected chips + clear */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedCategories.map((id) => {
            const interest = interests.find((i) => i.id === id);
            if (!interest) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {interest.icon && <span>{interest.icon}</span>}
                {getInterestLabel(interest)}
                <button type="button" onClick={() => toggleCategory(id)} className="ml-0.5 opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {selectedLanguages.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {getLanguageLabel(code)}
              <button type="button" onClick={() => toggleLanguage(code)} className="ml-0.5 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t('clear')}
          </button>
        </div>
      )}
    </div>
  );
}
