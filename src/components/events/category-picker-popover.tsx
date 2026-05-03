'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown, Tag } from 'lucide-react';
import type { InterestCategory } from '@/types/database';
import { categoryColor } from '@/lib/events/category-colors';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

type CategoryPickerPopoverProps = {
  categories: InterestCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function CategoryPickerPopover({
  categories,
  selectedIds,
  onChange,
}: CategoryPickerPopoverProps) {
  const t = useTranslations('events.map');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const localized = useMemo(() => {
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name:
        c.translations?.[locale] ||
        c.translations?.en ||
        c.slug.replace(/[-_]/g, ' '),
    }));
  }, [categories, locale]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  function clearAll() {
    onChange([]);
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors sm:text-sm',
            hasSelection
              ? 'border-primary/60 bg-primary/15 text-primary-foreground/90 dark:text-primary'
              : 'border-border/60 bg-background/95 text-foreground hover:bg-muted',
          )}
          aria-label={t('pickCategories')}
        >
          <Tag className="h-3.5 w-3.5" />
          {hasSelection
            ? t('categoryFilter', { count: selectedIds.length })
            : t('pickCategories')}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0"
        align="center"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder={t('searchCategory')} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{t('noCategory')}</CommandEmpty>
            {localized.map((c) => {
              const checked = selectedSet.has(c.id);
              const color = categoryColor(c.id);
              return (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.slug}`}
                  onSelect={() => toggle(c.id)}
                  className="cursor-pointer"
                >
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <Check
                    className={cn(
                      'h-4 w-4 text-primary transition-opacity',
                      checked ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandList>
          {hasSelection && (
            <div className="flex items-center justify-between border-t px-2 py-2 text-xs">
              <span className="text-muted-foreground">
                {t('categoryFilter', { count: selectedIds.length })}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md px-2 py-1 font-medium text-primary hover:bg-muted"
              >
                {t('clearAll')}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
