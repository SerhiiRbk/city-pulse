'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { searchCities, upsertCityFromNominatim } from '@/lib/actions/cities';
import type { City } from '@/types/database';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
  namedetails?: Record<string, string>;
}

interface CityPickerProps {
  value: City | null;
  onChange: (city: City | null) => void;
  countryFilter?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function CityPicker({
  value,
  onChange,
  countryFilter,
  placeholder = 'Search city...',
  className,
  compact = false,
}: CityPickerProps) {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function getCityLabel(city: City): string {
    return city.translations[locale] || city.name;
  }

  const displayValue = value ? getCityLabel(value) : '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchDebounced = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setNominatimResults([]);
        return;
      }

      setIsSearching(true);

      const dbResults = await searchCities(q, countryFilter);
      setResults(dbResults);

      if (dbResults.length < 3) {
        try {
          const params = new URLSearchParams({
            format: 'json',
            addressdetails: '1',
            namedetails: '1',
            q: q,
            limit: '5',
            featuretype: 'city',
          });
          if (countryFilter) {
            params.set('countrycodes', countryFilter.toLowerCase());
          }
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { headers: { 'Accept-Language': `${locale},en` } },
          );
          const data: NominatimResult[] = await res.json();
          const existingNames = new Set(dbResults.map((c) => `${c.name}|${c.country}`));
          setNominatimResults(
            data.filter((r) => {
              const cityName = r.address.city || r.address.town || r.address.village;
              const country = r.address.country_code?.toUpperCase();
              return cityName && !existingNames.has(`${cityName}|${country}`);
            }),
          );
        } catch {
          setNominatimResults([]);
        }
      } else {
        setNominatimResults([]);
      }

      setIsSearching(false);
    },
    [countryFilter, locale],
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => searchDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchDebounced, isOpen]);

  function handleSelectCity(city: City) {
    onChange(city);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setNominatimResults([]);
  }

  async function handleSelectNominatim(result: NominatimResult) {
    const cityName = result.address.city || result.address.town || result.address.village || '';
    const countryCode = result.address.country_code?.toUpperCase() || '';

    const translations: Record<string, string> = {};
    if (result.namedetails) {
      const langMap: Record<string, string> = {
        'name:en': 'en', 'name:ru': 'ru', 'name:uk': 'uk',
        'name:cs': 'cs', 'name:de': 'de',
      };
      for (const [key, lang] of Object.entries(langMap)) {
        if (result.namedetails[key]) translations[lang] = result.namedetails[key];
      }
    }

    const city = await upsertCityFromNominatim({
      name: cityName,
      country: countryCode,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      translations,
    });

    if (city) {
      onChange(city);
    }
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setNominatimResults([]);
  }

  function handleClear() {
    onChange(null);
    setQuery('');
    setResults([]);
    setNominatimResults([]);
  }

  const hasResults = results.length > 0 || nominatimResults.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {value && !isOpen ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background text-left text-sm ring-offset-background transition-colors hover:bg-accent ${compact ? 'h-9 px-3' : 'h-10 px-3'}`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{displayValue}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`pl-9 ${compact ? 'h-9' : ''}`}
          />
          {isSearching && (
            <Loader2 className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {isOpen && hasResults && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            {results.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelectCity(city)}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="font-medium">{getCityLabel(city)}</span>
                  {city.translations[locale] && city.translations[locale] !== city.name && (
                    <span className="ml-1.5 text-muted-foreground">({city.name})</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{city.country}</span>
              </button>
            ))}

            {nominatimResults.length > 0 && results.length > 0 && (
              <div className="my-1 border-t" />
            )}

            {nominatimResults.map((result, i) => {
              const cityName = result.address.city || result.address.town || result.address.village || '';
              return (
                <button
                  key={`nom-${i}`}
                  type="button"
                  onClick={() => handleSelectNominatim(result)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span className="flex-1">
                    <span className="font-medium">{cityName}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      ({result.address.country || ''})
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                    {result.address.country_code?.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOpen && query.length >= 2 && !isSearching && !hasResults && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
          No cities found
        </div>
      )}
    </div>
  );
}
