'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { Interest } from '@/types/database';

interface EventsFiltersProps {
  interests: Interest[];
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

export function EventsFilters({ interests, currentFilters }: EventsFiltersProps) {
  const t = useTranslations('events.filters');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations['en'] || interest.slug;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {t('all')}
        </Button>

        {/* Quick date filters */}
        <Button
          variant={currentFilters.date_from === today && !currentFilters.date_to ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            applyFilter('date_from', today);
          }}
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
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('city')}</label>
              <Input
                placeholder={t('city')}
                defaultValue={currentFilters.city || ''}
                onBlur={(e) => applyFilter('city', e.target.value || undefined)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('country')}</label>
              <Input
                placeholder={t('country')}
                defaultValue={currentFilters.country || ''}
                onBlur={(e) => applyFilter('country', e.target.value || undefined)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('dateRange')}</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  defaultValue={currentFilters.date_from || ''}
                  onChange={(e) => applyFilter('date_from', e.target.value || undefined)}
                />
                <Input
                  type="date"
                  defaultValue={currentFilters.date_to || ''}
                  onChange={(e) => applyFilter('date_to', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('interests')}</label>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((interest) => (
                <Badge
                  key={interest.id}
                  variant={currentFilters.category === interest.id ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() =>
                    applyFilter('category', currentFilters.category === interest.id ? undefined : interest.id)
                  }
                >
                  {getInterestLabel(interest)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
