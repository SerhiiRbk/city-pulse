'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { cn, countryCodeToFlag } from '@/lib/utils';

interface LanguageMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
}

export function LanguageMultiSelect({
  value,
  onChange,
  open,
  onOpenChange,
  label,
}: LanguageMultiSelectProps) {
  const t = useTranslations('profile');
  const locale = useLocale();

  function toggleLanguage(code: string) {
    onChange(
      value.includes(code)
        ? value.filter((item) => item !== code)
        : [...value, code],
    );
  }

  function getLanguageLabel(code: string) {
    const language = LANGUAGES.find((item) => item.code === code);
    if (!language) return code;

    return language[locale as keyof typeof language] || language.en;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((code) => {
          const language = LANGUAGES.find((item) => item.code === code);

          return (
            <span
              key={code}
              className="bg-background inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
            >
              {language && (
                <span className="text-base leading-none">
                  {countryCodeToFlag(language.flag)}
                </span>
              )}
              {getLanguageLabel(code)}
              <button
                type="button"
                onClick={() => toggleLanguage(code)}
                className="text-muted-foreground hover:text-foreground -mr-1 ml-0.5 rounded-full p-0.5 transition-colors"
                aria-label={getLanguageLabel(code)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}

        {value.length === 0 && (
          <span className="text-muted-foreground text-sm">
            {t('noLanguagesSelected')}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" type="button" className="w-full justify-between">
            {label || t('addLanguage')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="max-h-64 w-[--radix-popover-trigger-width] overflow-y-auto p-1"
          align="start"
        >
          {LANGUAGES.map((language) => {
            const selected = value.includes(language.code);

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
                <Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                <span className="text-base leading-none">
                  {countryCodeToFlag(language.flag)}
                </span>
                {language[locale as keyof typeof language] || language.en}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
