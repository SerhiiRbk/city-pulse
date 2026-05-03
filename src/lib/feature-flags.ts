import { createClient } from '@/lib/supabase/server';

/**
 * Tiny, dependency-free feature-flag helper.
 *
 * Design:
 *   * Source of truth is the `public.feature_flags` table (see
 *     migration 047). The client-side bundle has no flag config
 *     baked in, so changes don't require a deploy.
 *   * Rollout is deterministic — we hash `userId || slug` into
 *     [0..99] and compare against `rollout_pct`. The same user
 *     always sees the same answer for the same flag, which keeps
 *     the experience stable across navigations and avoids the
 *     "saw a feature once, then it disappeared" complaint that
 *     plagues random-rollout systems.
 *   * Anonymous users (`userId == null`) only see flags whose
 *     `rollout_pct === 100`. This is intentional: we can't pin a
 *     stable identity for them, so we err on the side of "show
 *     the same experience to everyone signed-out".
 *   * `allowlist_user_ids` always wins, regardless of `rollout_pct`.
 *
 * Caching:
 *   We rely on the request-level Supabase client cache. A flag
 *   read is a single primary-key lookup; no need for a process
 *   memoizer. If we ever hit thousands of flag checks per render,
 *   move to `'use cache'` keyed on `slug`.
 */

const FALLBACK_ON_ERROR = false;

interface FeatureFlagRow {
  slug: string;
  rollout_pct: number;
  allowlist_user_ids: string[];
  enabled: boolean;
}

/**
 * Stable, fast 32-bit hash. Not cryptographic — we only need a
 * uniform distribution of `[0..99]` per (user, flag) pair.
 */
function hashStringToBucket(input: string): number {
  let hash = 2166136261; // FNV-1a 32-bit offset
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Make positive and reduce to [0..99].
  return Math.abs(hash) % 100;
}

export async function isFeatureEnabled(
  slug: string,
  userId: string | null,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('slug, rollout_pct, allowlist_user_ids, enabled')
      .eq('slug', slug)
      .maybeSingle<FeatureFlagRow>();

    if (error || !data) return FALLBACK_ON_ERROR;
    if (!data.enabled) return false;

    if (data.rollout_pct >= 100) return true;

    if (userId && data.allowlist_user_ids.includes(userId)) return true;

    if (data.rollout_pct <= 0) return false;
    if (!userId) return false;

    const bucket = hashStringToBucket(`${userId}:${slug}`);
    return bucket < data.rollout_pct;
  } catch {
    return FALLBACK_ON_ERROR;
  }
}

/**
 * Convenience helper for code paths that already have the
 * viewer context handy. Avoids re-fetching the same row when we
 * need to check several flags in one render.
 */
export async function loadFeatureFlags(
  userId: string | null,
  slugs: readonly string[],
): Promise<Record<string, boolean>> {
  if (slugs.length === 0) return {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('feature_flags')
      .select('slug, rollout_pct, allowlist_user_ids, enabled')
      .in('slug', slugs as string[]);

    const out: Record<string, boolean> = {};
    for (const slug of slugs) out[slug] = false;

    for (const row of (data ?? []) as FeatureFlagRow[]) {
      if (!row.enabled) continue;
      if (row.rollout_pct >= 100) {
        out[row.slug] = true;
        continue;
      }
      if (userId && row.allowlist_user_ids.includes(userId)) {
        out[row.slug] = true;
        continue;
      }
      if (row.rollout_pct <= 0 || !userId) continue;
      const bucket = hashStringToBucket(`${userId}:${row.slug}`);
      if (bucket < row.rollout_pct) out[row.slug] = true;
    }

    return out;
  } catch {
    const out: Record<string, boolean> = {};
    for (const slug of slugs) out[slug] = FALLBACK_ON_ERROR;
    return out;
  }
}
