'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityGate } from '@/lib/system-events/quality-gates';

const ICON_BY_LEVEL = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const COLOR_BY_LEVEL = {
  error: 'text-destructive',
  warning: 'text-amber-600',
  info: 'text-muted-foreground',
} as const;

/**
 * Sidebar panel that surfaces composer quality gates as the editor types.
 * Pure presentational — gates are computed elsewhere (`runQualityGates`).
 */
export function QualityGatesPanel({ gates }: { gates: QualityGate[] }) {
  const t = useTranslations('admin.systemEvents.gates');

  const errorCount = gates.filter((g) => g.level === 'error').length;
  const warningCount = gates.filter((g) => g.level === 'warning').length;
  const allClear = gates.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {t('panelTitle')}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('summary', { errors: errorCount, warnings: warningCount })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allClear ? (
          <p className="text-sm text-emerald-600">{t('allClear')}</p>
        ) : (
          <ul className="space-y-2.5">
            {gates.map((gate) => {
              const Icon = ICON_BY_LEVEL[gate.level];
              const color = COLOR_BY_LEVEL[gate.level];
              return (
                <li key={gate.id} className="flex items-start gap-2 text-sm">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <span className="leading-snug">
                    {t(gate.messageKey as never, gate.values as never)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
