'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';

interface FeedFiltersProps {
  currentFilters: Record<string, string | undefined>;
  locale: string;
}

export function FeedFilters({ currentFilters, locale }: FeedFiltersProps) {
  const t = useTranslations('feed');
  const router = useRouter();
  const pathname = usePathname();

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = !!(currentFilters.country || currentFilters.language || currentFilters.type);

  const countryLabel = (c: (typeof COUNTRIES)[number]) =>
    (c as Record<string, string>)[locale] || c.en;

  const languageLabel = (l: (typeof LANGUAGES)[number]) =>
    (l as Record<string, string>)[locale] || l.en;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentFilters.country || '_all'}
        onValueChange={(v) => applyFilters({ country: v === '_all' ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full border-border/50 bg-card text-sm shadow-sm">
          <SelectValue placeholder={t('filterCountry')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('allCountries')}</SelectItem>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {countryLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.language || '_all'}
        onValueChange={(v) => applyFilters({ language: v === '_all' ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full border-border/50 bg-card text-sm shadow-sm">
          <SelectValue placeholder={t('filterLanguage')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('allLanguages')}</SelectItem>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {languageLabel(l)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.type || '_all'}
        onValueChange={(v) => applyFilters({ type: v === '_all' ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full border-border/50 bg-card text-sm shadow-sm">
          <SelectValue placeholder={t('filterType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">{t('allTypes')}</SelectItem>
          <SelectItem value="update">{t('typeUpdate')}</SelectItem>
          <SelectItem value="announcement">{t('typeAnnouncement')}</SelectItem>
          <SelectItem value="event_recap">{t('typeRecap')}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-full"
          onClick={() => applyFilters({ country: undefined, language: undefined, type: undefined })}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
