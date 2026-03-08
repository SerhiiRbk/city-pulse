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
import { Search, X, ChevronsUpDown, Check, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES } from '@/lib/constants';
import { CityPicker } from '@/components/ui/city-picker';
import type { Interest, InterestCategory, City } from '@/types/database';

interface EventsFiltersProps {
  interests: Interest[];
  categories: InterestCategory[];
  currentFilters: {
    city?: string;
    city_id?: string;
    country?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    is_free?: string;
    is_online?: string;
    when?: string;
  };
}

function getDateRange(when: string): { from: string; to?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (when) {
    case 'today':
      return { from: fmt(now) };
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return { from: fmt(d) };
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

export function EventsFilters({ interests, categories, currentFilters }: EventsFiltersProps) {
  const t = useTranslations('events.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [rangeFrom, setRangeFrom] = useState(currentFilters.when === 'range' ? (currentFilters.date_from || '') : '');
  const [rangeTo, setRangeTo] = useState(currentFilters.when === 'range' ? (currentFilters.date_to || '') : '');

  const selectedCategories = currentFilters.category
    ? currentFilters.category.split(',').filter(Boolean)
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

  return (
    <div className="space-y-3 sm:space-y-4">
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

      <div className="grid gap-3 xl:grid-cols-[170px_190px_minmax(0,1.1fr)_190px_170px_auto]">
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

        <div className="hidden xl:block">
          <div className="rounded-[1.1rem] border border-border/70 bg-muted/45 px-4 py-3 text-sm text-foreground shadow-sm">
            {t('helper')}
          </div>
        </div>

        {/* Interests */}
        <div>
          <Popover open={interestsOpen} onOpenChange={setInterestsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className={cn(controlTrigger, 'justify-between font-normal')}>
                {selectedCategories.length > 0 ? (
                  <span className="truncate">{t('selectedCount', { count: selectedCategories.length })}</span>
                ) : (
                  <span className="text-muted-foreground">{t('interests')}</span>
                )}
                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
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

        {/* When — Popover with presets + date range */}
        <div>
          <Popover open={whenOpen} onOpenChange={setWhenOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className={cn(controlTrigger, 'justify-between font-normal')}>
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
        <Button className="h-10 sm:h-11 rounded-xl px-6 font-semibold shadow-md" onClick={handleSearch}>
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
