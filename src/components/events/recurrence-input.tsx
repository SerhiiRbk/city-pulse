'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurrenceFrequency } from '@/lib/recurrence/expand';

export type RecurrenceState =
  | { frequency: 'none' }
  | { frequency: RecurrenceFrequency; count: number };

interface RecurrenceInputProps {
  value: RecurrenceState;
  onChange: (next: RecurrenceState) => void;
}

/**
 * Tiny form fragment letting an organiser turn an event into a
 * series during creation. We expose three preset cadences and a
 * count selector capped at 52 (one year of weekly meet-ups).
 *
 * The component is purely presentational — the parent form turns
 * this state into the `createSeriesFromEvent` call after the seed
 * event has been inserted.
 */
export function RecurrenceInput({ value, onChange }: RecurrenceInputProps) {
  const t = useTranslations('recurring');

  const isRecurring = value.frequency !== 'none';
  const count = isRecurring ? (value as { count: number }).count : 4;

  function handleFrequency(next: string) {
    if (next === 'none') {
      onChange({ frequency: 'none' });
      return;
    }
    onChange({
      frequency: next as RecurrenceFrequency,
      count: count || 4,
    });
  }

  function handleCount(next: string) {
    if (!isRecurring) return;
    const parsed = Math.min(Math.max(Number(next) || 1, 2), 52);
    onChange({ frequency: value.frequency, count: parsed });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="recurrence-frequency" className="text-sm">
            {t('frequencyLabel')}
          </Label>
          <Select
            value={isRecurring ? value.frequency : 'none'}
            onValueChange={handleFrequency}
          >
            <SelectTrigger id="recurrence-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noneLabel')}</SelectItem>
              <SelectItem value="weekly">{t('weeklyLabel')}</SelectItem>
              <SelectItem value="biweekly">{t('everyTwoWeeksLabel')}</SelectItem>
              <SelectItem value="monthly">{t('monthlyLabel')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurrence-count" className="text-sm">
            {t('occurrencesLabel')}
          </Label>
          <Input
            id="recurrence-count"
            type="number"
            min={2}
            max={52}
            value={isRecurring ? count : ''}
            placeholder="4"
            onChange={(e) => handleCount(e.target.value)}
            disabled={!isRecurring}
          />
        </div>
      </div>
      {isRecurring && (
        <p className="text-xs text-muted-foreground">{t('helper')}</p>
      )}
    </div>
  );
}
