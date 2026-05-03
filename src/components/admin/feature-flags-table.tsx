'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateFeatureFlag, type FeatureFlag } from '@/lib/actions/feature-flags';

interface FeatureFlagsTableProps {
  initialFlags: FeatureFlag[];
}

interface DraftFlag extends FeatureFlag {
  isDirty: boolean;
}

export function FeatureFlagsTable({ initialFlags }: FeatureFlagsTableProps) {
  const [flags, setFlags] = useState<DraftFlag[]>(
    initialFlags.map((flag) => ({ ...flag, isDirty: false })),
  );
  const [isSaving, startTransition] = useTransition();

  function patchFlag(slug: string, patch: Partial<FeatureFlag>) {
    setFlags((prev) =>
      prev.map((f) => (f.slug === slug ? { ...f, ...patch, isDirty: true } : f)),
    );
  }

  function save(slug: string) {
    const flag = flags.find((f) => f.slug === slug);
    if (!flag) return;
    startTransition(async () => {
      const result = await updateFeatureFlag(slug, {
        rollout_pct: flag.rollout_pct,
        enabled: flag.enabled,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${slug} updated`);
      setFlags((prev) =>
        prev.map((f) => (f.slug === slug ? { ...f, isDirty: false } : f)),
      );
    });
  }

  if (flags.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No feature flags found. Run migration <code>047_feature_flags.sql</code> first.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {flags.map((flag) => {
        const fullyOn = flag.enabled && flag.rollout_pct >= 100;
        const fullyOff = !flag.enabled || flag.rollout_pct <= 0;
        const stateLabel = !flag.enabled
          ? 'Kill-switched'
          : fullyOn
            ? 'On for all'
            : fullyOff
              ? 'Off'
              : `${flag.rollout_pct}% rollout`;
        const stateVariant: 'default' | 'secondary' | 'destructive' = !flag.enabled
          ? 'destructive'
          : fullyOn
            ? 'default'
            : 'secondary';
        return (
          <Card key={flag.slug} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold">
                    {flag.slug}
                  </code>
                  <Badge variant={stateVariant}>{stateLabel}</Badge>
                </div>
                {flag.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{flag.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => patchFlag(flag.slug, { enabled: checked })}
                  />
                  Enabled
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                Rollout %
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={flag.rollout_pct}
                  onChange={(e) =>
                    patchFlag(flag.slug, {
                      rollout_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-20"
                />
              </label>
              <Button
                size="sm"
                disabled={!flag.isDirty || isSaving}
                onClick={() => save(flag.slug)}
              >
                Save
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
