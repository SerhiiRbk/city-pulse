'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/server/viewer-context';

export interface FeatureFlag {
  slug: string;
  description: string | null;
  rollout_pct: number;
  allowlist_user_ids: string[];
  enabled: boolean;
  updated_at: string;
}

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await getViewerContext();
  if (!viewer.isAdmin) return { ok: false, error: 'Forbidden' };
  return { ok: true };
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const guard = await ensureAdmin();
  if (!guard.ok) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('feature_flags')
    .select('slug, description, rollout_pct, allowlist_user_ids, enabled, updated_at')
    .order('slug', { ascending: true });
  return (data ?? []) as FeatureFlag[];
}

export async function updateFeatureFlag(
  slug: string,
  patch: {
    rollout_pct?: number;
    enabled?: boolean;
    description?: string | null;
    allowlist_user_ids?: string[];
  },
): Promise<{ error?: string; success?: boolean }> {
  const guard = await ensureAdmin();
  if (!guard.ok) return { error: guard.error };

  const sanitised: Record<string, unknown> = {};
  if (typeof patch.rollout_pct === 'number') {
    if (patch.rollout_pct < 0 || patch.rollout_pct > 100) {
      return { error: 'rollout_pct must be 0..100' };
    }
    sanitised.rollout_pct = Math.round(patch.rollout_pct);
  }
  if (typeof patch.enabled === 'boolean') sanitised.enabled = patch.enabled;
  if (patch.description !== undefined) sanitised.description = patch.description;
  if (Array.isArray(patch.allowlist_user_ids)) {
    sanitised.allowlist_user_ids = patch.allowlist_user_ids.filter(
      (id) => typeof id === 'string' && id.length > 0,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('feature_flags')
    .update(sanitised)
    .eq('slug', slug);

  if (error) return { error: error.message };
  revalidatePath('/admin/feature-flags');
  return { success: true };
}
