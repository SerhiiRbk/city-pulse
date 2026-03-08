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

const WHEN_LABELS: Record<string, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekend: 'This weekend',
  next_week: 'Next week',
};

export function EventsFilters({ interests, categories, currentFilters }: EventsFiltersProps) {
  const t = useTranslations('events.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [nameValue, setNameValue] = useState('');
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

  const glassInput = 'h-11 border-white/20 bg-white/10 text-white placeholder:text-white/60 backdrop-blur-sm focus-visible:ring-white/30';
  const glassTrigger = 'h-11 w-full border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white [&>svg]:text-white/60';

  const whenLabel = currentFilters.when === 'range' && (currentFilters.date_from || currentFilters.date_to)
    ? `${currentFilters.date_from || '...'} — ${currentFilters.date_to || '...'}`
    : currentFilters.when && WHEN_LABELS[currentFilters.when]
      ? WHEN_LABELS[currentFilters.when]
      : null;

  return (
    <div className="space-y-3">
      <div className="mx-auto flex flex-wrap items-end justify-center gap-2">
        {/* Country */}
        <div className="w-[170px]">
          <Select
            value={currentFilters.country || ''}
            onValueChange={(val) => applyFilter('country', val === '_all' ? undefined : val)}
          >
            <SelectTrigger className={glassTrigger}>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All countries</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {countryCodeToFlag(c.code)} {(c as Record<string, string>)[locale] || c.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="w-[180px]">
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
            placeholder="City"
            compact
          />
        </div>

        {/* Event name */}
        <div className="w-[150px]">
          <Input
            className={glassInput}
            placeholder="Event name..."
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>

        {/* Interests */}
        <div className="w-[160px]">
          <Popover open={interestsOpen} onOpenChange={setInterestsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className={cn(glassTrigger, 'justify-between font-normal')}>
                {selectedCategories.length > 0 ? (
                  <span className="truncate">{selectedCategories.length} selected</span>
                ) : (
                  <span className="text-white/60">Interests</span>
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
        <div className="w-[190px]">
          <Popover open={whenOpen} onOpenChange={setWhenOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className={cn(glassTrigger, 'justify-between font-normal')}>
                <span className="flex items-center gap-2 truncate">
                  <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
                  {whenLabel ? (
                    <span className="truncate text-white">{whenLabel}</span>
                  ) : (
                    <span className="text-white/60">When</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              {/* Presets */}
              <div className="border-b p-1">
                {(['any', 'today', 'tomorrow', 'weekend', 'next_week'] as const).map((preset) => {
                  const active = preset === 'any'
                    ? !currentFilters.when
                    : currentFilters.when === preset;
                  const label = preset === 'any' ? 'Any time' : WHEN_LABELS[preset];
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
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Date range</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-[11px]">From</label>
                    <Input
                      type="date"
                      className="h-11"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-[11px]">To</label>
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
                  Apply range
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Status */}
        <div className="w-[130px]">
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
            <SelectTrigger className={glassTrigger}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All</SelectItem>
              <SelectItem value="free">{t('free')}</SelectItem>
              <SelectItem value="online">{t('online')}</SelectItem>
              <SelectItem value="offline">{t('offline')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search button */}
        <Button className="h-11 px-6 font-semibold shadow-md" onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          SEARCH
        </Button>
      </div>

      {/* Selected chips + clear */}
      {hasFilters && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {selectedCategories.map((id) => {
            const interest = interests.find((i) => i.id === id);
            if (!interest) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
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
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
