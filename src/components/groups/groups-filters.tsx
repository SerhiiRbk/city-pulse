'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { clearSavedFilters } from '@/lib/hooks/use-saved-filters';
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
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { CityPicker } from '@/components/ui/city-picker';
import type { City, Interest, InterestCategory } from '@/types/database';

interface GroupsFiltersProps {
  interests: Interest[];
  categories: InterestCategory[];
  /** Pre-resolved city object so the picker shows a label on first
   *  render (e.g. from geo-detection or profile city). */
  initialCity?: City | null;
  /** When true, hide the country and city filter fields (used on city-specific pages). */
  hideCity?: boolean;
  /** Base path for filter navigation (e.g. '/cities/prague/groups'). */
  basePath?: string;
  currentFilters: {
    city?: string;
    city_id?: string;
    country?: string;
    interest?: string;
    language?: string;
    q?: string;
  };
}

export function GroupsFilters({ interests, categories, initialCity, hideCity, basePath, currentFilters }: GroupsFiltersProps) {
  const t = useTranslations('groups.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity ?? null);
  const [searchQuery, setSearchQuery] = useState(currentFilters.q || '');

  const selectedInterestIds = currentFilters.interest
    ? currentFilters.interest.split(',').filter(Boolean)
    : [];
  const selectedLanguages = currentFilters.language
    ? currentFilters.language.split(',').filter(Boolean)
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

  function getLanguageLabel(code: string) {
    const language = LANGUAGES.find((item) => item.code === code);
    if (!language) return code;
    return language[locale as keyof typeof language] || language.en;
  }

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...overrides };

    if (basePath) {
      Object.entries(merged).forEach(([key, value]) => {
        if (!value) return;
        if (key === 'city' || key === 'city_id' || key === 'country' || key === 'geo_off') return;
        params.set(key, value);
      });
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
      return;
    }

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

  function toggleLanguage(code: string) {
    const next = selectedLanguages.includes(code)
      ? selectedLanguages.filter((item) => item !== code)
      : [...selectedLanguages, code];
    applyFilters({ language: next.length > 0 ? next.join(',') : undefined });
  }

  function clearFilters() {
    setSelectedCity(null);
    setSearchQuery('');
    clearSavedFilters();
    router.push(`${pathname}?geo_off=1`);
  }

  function applyTextSearch(value: string) {
    const trimmed = value.trim();
    applyFilters({ q: trimmed.length > 0 ? trimmed : undefined });
  }

  function handleSearch() {
    applyFilters({
      city_id: selectedCity?.id || currentFilters.city_id || undefined,
      city: selectedCity?.name || currentFilters.city || undefined,
      geo_off: undefined,
    });
  }

  const hasFilters = Object.entries(currentFilters).some(([k, v]) => v && k !== 'geo_off');
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
  const languagesHint = selectedLanguages.length > 0
    ? selectedLanguages.map((code) => getLanguageLabel(code)).join(', ')
    : null;

  const controlTrigger = 'h-10 sm:h-11 w-full rounded-xl border-border/70 bg-background/92 text-foreground shadow-sm hover:bg-muted/70 hover:text-foreground [&>svg]:text-muted-foreground';

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
              applyTextSearch(searchQuery);
            }
          }}
          onBlur={(e) => applyTextSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="bg-background/95 h-10 rounded-xl pl-9 pr-9 text-sm shadow-sm sm:h-11"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              applyFilters({ q: undefined });
            }}
            aria-label={t('clearSearch')}
            className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {!hideCity && (
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
        )}

        {!hideCity && (
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
        )}

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
