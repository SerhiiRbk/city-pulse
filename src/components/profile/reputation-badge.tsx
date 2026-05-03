'use client';

import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReputationTier } from '@/lib/actions/social';

interface ReputationBadgeProps {
  tier: ReputationTier;
  reliabilityScore: number;
  attendanceRate: number | null;
  attendedCount: number;
  noShowCount: number;
  compact?: boolean;
}

const TIER_STYLES: Record<ReputationTier, { dot: string; chip: string; icon: string }> = {
  newcomer: {
    dot: 'bg-slate-400',
    chip: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200',
    icon: '🌱',
  },
  regular: {
    dot: 'bg-sky-500',
    chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
    icon: '⭐',
  },
  trusted: {
    dot: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    icon: '✅',
  },
  elite: {
    dot: 'bg-amber-500',
    chip: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
    icon: '🏆',
  },
};

export function ReputationBadge({
  tier,
  reliabilityScore,
  attendanceRate,
  attendedCount,
  noShowCount,
  compact = false,
}: ReputationBadgeProps) {
  const t = useTranslations('profile.reputation');
  const style = TIER_STYLES[tier];
  const label = t(`tier.${tier}`);
  const ratePct = attendanceRate === null ? null : Math.round(attendanceRate);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style.chip}`}
          >
            <span aria-hidden>{style.icon}</span>
            <span>{label}</span>
            {!compact && ratePct !== null && (
              <span className="text-[10px] opacity-70">· {ratePct}%</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">
              {t('tierDescription', { tier })}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs">
              <span className="text-muted-foreground">{t('reliability')}</span>
              <span className="font-medium">{reliabilityScore}/100</span>
              {ratePct !== null && (
                <>
                  <span className="text-muted-foreground">
                    {t('attendanceRate')}
                  </span>
                  <span className="font-medium">{ratePct}%</span>
                </>
              )}
              <span className="text-muted-foreground">{t('attended')}</span>
              <span className="font-medium">{attendedCount}</span>
              {noShowCount > 0 && (
                <>
                  <span className="text-muted-foreground">
                    {t('noShow')}
                  </span>
                  <span className="font-medium">{noShowCount}</span>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
