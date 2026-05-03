'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Heart,
  ShieldCheck,
  Sparkles,
  Wine,
  Users,
} from 'lucide-react';
import { SAFETY_TAGS, type SafetyTag } from '@/types/database';

const ICONS: Record<SafetyTag, typeof ShieldCheck> = {
  women_only: Heart,
  adults_only: ShieldCheck,
  lgbtq_friendly: Sparkles,
  sober: Wine,
  beginner_friendly: Users,
};

const TONE: Record<SafetyTag, string> = {
  women_only: 'border-pink-300/70 bg-pink-50 text-pink-900 dark:border-pink-800/50 dark:bg-pink-950/30 dark:text-pink-200',
  adults_only: 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200',
  lgbtq_friendly: 'border-violet-300/70 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-200',
  sober: 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  beginner_friendly: 'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200',
};

function isSafetyTag(value: string): value is SafetyTag {
  return (SAFETY_TAGS as readonly string[]).includes(value);
}

interface SafetyTagBadgesProps {
  tags: string[] | null | undefined;
  /** Compact = no icons, smaller padding. */
  compact?: boolean;
  /** Hard cap on rendered badges; remainder collapsed into "+N". */
  max?: number;
  className?: string;
}

/**
 * Renders the controlled-vocabulary safety tags as colored badges.
 * Unknown values are silently dropped so the UI never breaks if the
 * server expands the vocabulary ahead of the client.
 */
export function SafetyTagBadges({ tags, compact = false, max, className }: SafetyTagBadgesProps) {
  const t = useTranslations('events.safety');
  const valid = (tags || []).filter(isSafetyTag);
  if (valid.length === 0) return null;
  const visible = max ? valid.slice(0, max) : valid;
  const overflow = max && valid.length > max ? valid.length - max : 0;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map((tag) => {
        const Icon = ICONS[tag];
        return (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              TONE[tag],
            )}
          >
            {!compact && <Icon className="mr-1 h-3 w-3" />}
            {t(`tag.${tag}`)}
          </Badge>
        );
      })}
      {overflow > 0 && (
        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] font-medium">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
