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
import { Filter, X, ChevronsUpDown, Check, MapPin, CalendarDays, Sparkles, Search } from 'lucide-react';
import { useState } from 'react';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES } from '@/lib/constants';
import type { Interest, InterestCategory } from '@/types/database';

interface EventsFiltersProps {
  interests: Interest[];
  categories: InterestCategory[];
  currentFilters: {
    city?: string;
    country?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    is_free?: string;
    is_online?: string;
  };
}

export function EventsFilters({ interests, categories, currentFilters }: EventsFiltersProps) {
  const t = useTranslations('events.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const selectedCategories = currentFilters.category
    ? currentFilters.category.split(',').filter(Boolean)
    : [];

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations['en'] || interest.slug;
  }

  function getCategoryLabel(cat: InterestCategory): string {
    return cat.translations[locale] || cat.translations['en'] || cat.slug;
  }

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => {
      if (v && k !== key) params.set(k, v);
    });
    if (value) params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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

  const hasFilters = Object.values(currentFilters).some(Boolean);
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const friday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
    return d.toISOString().split('T')[0];
  })();
  const sunday = (() => {
    const d = new Date(friday);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  })();

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

  const activeFilterCount = [
    currentFilters.country,
    currentFilters.city,
    currentFilters.category,
    currentFilters.date_from,
    currentFilters.is_free,
    currentFilters.is_online,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Quick filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          {t('all')}
          {activeFilterCount > 0 && (
            <span className="bg-primary-foreground text-primary ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />

        <Button
          variant={currentFilters.date_from === today && !currentFilters.date_to ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyFilter('date_from', today)}
        >
          {t('today')}
        </Button>
        <Button
          variant={currentFilters.date_from === tomorrow ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyFilter('date_from', tomorrow)}
        >
          {t('tomorrow')}
        </Button>
        <Button
          variant={currentFilters.date_from === friday ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const params = new URLSearchParams();
            params.set('date_from', friday);
            params.set('date_to', sunday);
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          {t('weekend')}
        </Button>

        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />

        <Button
          variant={currentFilters.is_free === 'true' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyFilter('is_free', currentFilters.is_free === 'true' ? undefined : 'true')}
        >
          {t('free')}
        </Button>
        <Button
          variant={currentFilters.is_online === 'true' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyFilter('is_online', currentFilters.is_online === 'true' ? undefined : 'true')}
        >
          {t('online')}
        </Button>
        <Button
          variant={currentFilters.is_online === 'false' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyFilter('is_online', currentFilters.is_online === 'false' ? undefined : 'false')}
        >
          {t('offline')}
        </Button>

        {hasFilters && (
          <>
            <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive gap-1">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Selected interest chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((id) => {
            const interest = interests.find((i) => i.id === id);
            if (!interest) return null;
            return (
              <span
                key={id}
                className="bg-primary/5 border-primary/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
              >
                {interest.icon && <span className="text-base leading-none">{interest.icon}</span>}
                {getInterestLabel(interest)}
                <button
                  type="button"
                  onClick={() => toggleCategory(id)}
                  className="text-muted-foreground hover:text-destructive -mr-1 ml-0.5 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="bg-card animate-in fade-in-0 slide-in-from-top-2 rounded-xl border p-5 shadow-sm duration-200">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <MapPin className="h-3 w-3" />
                {t('country')}
              </label>
              <Select
                value={currentFilters.country || ''}
                onValueChange={(val) => applyFilter('country', val === '_all' ? undefined : val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('country')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">— {t('country')} —</SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {countryCodeToFlag(c.code)} {(c as Record<string, string>)[locale] || c.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Search className="h-3 w-3" />
                {t('city')}
              </label>
              <Input
                placeholder={t('city')}
                defaultValue={currentFilters.city || ''}
                onBlur={(e) => applyFilter('city', e.target.value || undefined)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilter('city', (e.target as HTMLInputElement).value || undefined);
                }}
              />
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <CalendarDays className="h-3 w-3" />
                {t('dateRange')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  defaultValue={currentFilters.date_from || ''}
                  onChange={(e) => applyFilter('date_from', e.target.value || undefined)}
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                  type="date"
                  defaultValue={currentFilters.date_to || ''}
                  onChange={(e) => applyFilter('date_to', e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                {t('interests')}
              </label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="h-9 w-full justify-between font-normal">
                    {selectedCategories.length > 0 ? (
                      <span className="truncate">
                        {selectedCategories.length} selected
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select interests...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="max-h-80 w-[--radix-popover-trigger-width] overflow-y-auto p-2"
                  align="start"
                >
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
                            <Check
                              className={cn(
                                'h-4 w-4 shrink-0',
                                selected ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {interest.icon && (
                              <span className="text-base leading-none">{interest.icon}</span>
                            )}
                            {getInterestLabel(interest)}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
