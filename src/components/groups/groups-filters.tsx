'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
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
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES } from '@/lib/constants';
import { CityPicker } from '@/components/ui/city-picker';
import type { City, Interest, InterestCategory } from '@/types/database';

interface GroupsFiltersProps {
  interests: Interest[];
  categories: InterestCategory[];
  currentFilters: {
    city?: string;
    city_id?: string;
    country?: string;
    interest?: string;
  };
}

export function GroupsFilters({ interests, categories, currentFilters }: GroupsFiltersProps) {
  const t = useTranslations('groups.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const selectedInterestIds = currentFilters.interest
    ? currentFilters.interest.split(',').filter(Boolean)
    : [];

  const currentCityValue = selectedCity ?? (
    currentFilters.city
      ? {
          id: currentFilters.city_id || currentFilters.city,
          name: currentFilters.city,
          country: currentFilters.country || '',
          lat: 0,
          lng: 0,
          translations: { [locale]: currentFilters.city },
        }
      : null
  );

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations.en || interest.slug;
  }

  function getCategoryLabel(category: InterestCategory): string {
    return category.translations[locale] || category.translations.en || category.slug;
  }

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...overrides };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleInterest(id: string) {
    const next = selectedInterestIds.includes(id)
      ? selectedInterestIds.filter((item) => item !== id)
      : [...selectedInterestIds, id];
    applyFilters({ interest: next.length > 0 ? next.join(',') : undefined });
  }

  function clearFilters() {
    setSelectedCity(null);
    router.push(pathname);
  }

  function handleSearch() {
    applyFilters({
      city_id: selectedCity?.id || currentFilters.city_id || undefined,
      city: selectedCity?.name || currentFilters.city || undefined,
    });
  }

  const hasFilters = Object.values(currentFilters).some(Boolean);
  const uncategorizedCatId = categories.find((category) => category.slug === 'other')?.id;
  const groupedInterests = categories
    .map((category) => ({
      ...category,
      label: getCategoryLabel(category),
      items: interests.filter((interest) => {
        if (interest.category_id) return interest.category_id === category.id;
        return category.id === uncategorizedCatId;
      }),
    }))
    .filter((group) => group.items.length > 0);
  const interestsHint = selectedInterestIds.length > 0
    ? selectedInterestIds
        .map((id) => interests.find((interest) => interest.id === id))
        .filter(Boolean)
        .map((interest) => getInterestLabel(interest as Interest))
        .join(', ')
    : null;

  const controlTrigger = 'h-10 sm:h-11 w-full rounded-xl border-border/70 bg-background/92 text-foreground shadow-sm hover:bg-muted/70 hover:text-foreground [&>svg]:text-muted-foreground';

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Select
            value={currentFilters.country || ''}
            onValueChange={(value) =>
              applyFilters({
                country: value === '_all' ? undefined : value,
                city: undefined,
                city_id: undefined,
              })
            }
          >
            <SelectTrigger className={controlTrigger}>
              <SelectValue placeholder={t('country')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('allCountries')}</SelectItem>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {countryCodeToFlag(country.code)} {(country as Record<string, string>)[locale] || country.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <CityPicker
            value={currentCityValue}
            onChange={(city) => {
              setSelectedCity(city);
              if (!city) {
                applyFilters({ city: undefined, city_id: undefined });
              }
            }}
            countryFilter={currentFilters.country || undefined}
            placeholder={t('city')}
            compact
          />
        </div>

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
                      {selectedInterestIds.length > 0 ? (
                        <span className="truncate">{t('selectedCount', { count: selectedInterestIds.length })}</span>
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
                    const selected = selectedInterestIds.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        className={cn(
                          'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                          selected && 'bg-accent',
                        )}
                        onClick={() => toggleInterest(interest.id)}
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

        <Button className="h-10 w-full rounded-xl px-6 font-semibold shadow-md sm:h-11" onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          {t('searchCta')}
        </Button>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {currentFilters.country && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {COUNTRIES.find((country) => country.code === currentFilters.country)
                ? (COUNTRIES.find((country) => country.code === currentFilters.country) as Record<string, string>)[locale] ||
                  COUNTRIES.find((country) => country.code === currentFilters.country)?.en
                : currentFilters.country}
            </span>
          )}
          {currentFilters.city && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {currentFilters.city}
            </span>
          )}
          {selectedInterestIds.map((id) => {
            const interest = interests.find((item) => item.id === id);
            if (!interest) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {interest.icon && <span>{interest.icon}</span>}
                {getInterestLabel(interest)}
                <button type="button" onClick={() => toggleInterest(id)} className="ml-0.5 opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
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
