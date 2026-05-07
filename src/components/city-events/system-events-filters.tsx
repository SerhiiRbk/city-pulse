'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CityPicker } from '@/components/ui/city-picker';
import { COUNTRIES } from '@/lib/constants';
import { cn, countryCodeToFlag } from '@/lib/utils';
import {
  EVENT_DATE_PRESETS,
  isEventDatePreset,
  resolveEventPreset,
  type EventDatePreset,
} from '@/lib/dates/event-presets';
import type { City } from '@/types/database';
import { X } from 'lucide-react';

interface SystemEventsFiltersProps {
  currentFilters: {
    city?: string;
    city_id?: string;
    country?: string;
    when?: string;
    date_from?: string;
    date_to?: string;
  };
  /** Optional initial city object so the picker shows a localized label
   *  on first render instead of the raw `?city=` slug. */
  initialCity?: City | null;
}

const PRESET_KEY_TO_LABEL: Record<EventDatePreset, string> = {
  today: 'today',
  tomorrow: 'tomorrow',
  weekend: 'weekendLong',
  next_weekend: 'nextWeekend',
  next_week: 'nextWeek',
};

export function SystemEventsFilters({ currentFilters, initialCity }: SystemEventsFiltersProps) {
  const t = useTranslations('events.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity ?? null);

  const activePreset = isEventDatePreset(currentFilters.when) ? currentFilters.when : null;
  const hasFilters = Boolean(
    currentFilters.country ||
      currentFilters.city ||
      currentFilters.city_id ||
      currentFilters.when ||
      currentFilters.date_from ||
      currentFilters.date_to,
  );

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function pickPreset(preset: EventDatePreset | 'any') {
    if (preset === 'any') {
      applyFilters({ when: undefined, date_from: undefined, date_to: undefined });
      return;
    }
    const { from, to } = resolveEventPreset(preset);
    applyFilters({ when: preset, date_from: from, date_to: to });
  }

  function clearAll() {
    setSelectedCity(null);
    router.push(pathname);
  }

  const trigger =
    'h-10 sm:h-11 w-full rounded-xl border-border/70 bg-background/92 text-foreground shadow-sm hover:bg-muted/70 hover:text-foreground [&>svg]:text-muted-foreground';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Date presets — wrap on mobile */}
      <div className="flex flex-wrap gap-2 pb-1">
          <button
            type="button"
            onClick={() => pickPreset('any')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[13px] font-medium shadow-sm transition-colors sm:text-sm',
              !activePreset
                ? 'border-primary/30 bg-primary text-primary-foreground'
                : 'border-border/70 bg-background/90 text-foreground hover:bg-muted/70',
            )}
          >
            {t('anyTime')}
          </button>
          {EVENT_DATE_PRESETS.map((preset) => {
            const active = activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => pickPreset(preset)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[13px] font-medium shadow-sm transition-colors sm:text-sm',
                  active
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border/70 bg-background/90 text-foreground hover:bg-muted/70',
                )}
                aria-pressed={active}
              >
                {t(PRESET_KEY_TO_LABEL[preset])}
              </button>
            );
          })}
      </div>

      {/* Country + City selectors */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <Select
          value={currentFilters.country || ''}
          onValueChange={(val) =>
            applyFilters({ country: val === '_all' ? undefined : val })
          }
        >
          <SelectTrigger className={trigger}>
            <SelectValue placeholder={t('country')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('allCountries')}</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {countryCodeToFlag(c.code)}{' '}
                {(c as Record<string, string>)[locale] || c.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {hasFilters && (
          <Button
            variant="outline"
            type="button"
            onClick={clearAll}
            className={cn(trigger, 'sm:w-auto sm:px-4 font-normal')}
          >
            <X className="mr-1 h-4 w-4" />
            {t('clear')}
          </Button>
        )}
      </div>
    </div>
  );
}
