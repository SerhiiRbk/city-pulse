'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SAFETY_TAGS, type SafetyTag } from '@/types/database';

interface SafetyTagsInputProps {
  value: SafetyTag[];
  onChange: (next: SafetyTag[]) => void;
  /** Optional className applied to the chip container. */
  className?: string;
}

/**
 * Toggleable chip group for the controlled vocabulary defined in
 * `SAFETY_TAGS`. Designed to be embedded inside event create / edit
 * forms — the component is presentational and emits the full array
 * back through `onChange` on every interaction.
 */
export function SafetyTagsInput({ value, onChange, className }: SafetyTagsInputProps) {
  const t = useTranslations('events.safety');

  function toggle(tag: SafetyTag) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {SAFETY_TAGS.map((tag) => {
        const active = value.includes(tag);
        return (
          <button
            type="button"
            key={tag}
            onClick={() => toggle(tag)}
            aria-pressed={active}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Badge
              variant={active ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !active && 'border-border/70 bg-background/80 text-foreground hover:bg-muted/70',
              )}
            >
              {t(`tag.${tag}`)}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
