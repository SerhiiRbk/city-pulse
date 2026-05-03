'use server';

import { createClient } from '@/lib/supabase/server';

interface CompleteOnboardingInput {
  city_id: string | null;
  city_name: string | null;
  country: string | null;
  /**
   * Interest slugs (the `profiles.interests` column stores slugs,
   * not UUIDs — see migration 001 for the original choice).
   */
  interest_slugs: string[];
  languages: string[];
}

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 10;
const MAX_LANGUAGES = 6;

/**
 * Atomically commits the wizard's choices to the user's profile
 * and stamps `onboarded_at`, so subsequent layouts no longer
 * redirect them to /onboarding.
 *
 * We accept an explicit (city_id, city_name) pair instead of just
 * city_id so users can finish the wizard even if their city isn't
 * in our normalised cities list yet — this happens regularly for
 * smaller European towns. The `city` text column is the source of
 * truth in those cases until the cities table catches up.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (!input.country) return { error: 'Pick a country' };
  if (!input.city_name) return { error: 'Pick a city' };
  if (!Array.isArray(input.interest_slugs) || input.interest_slugs.length < MIN_INTERESTS) {
    return { error: `Pick at least ${MIN_INTERESTS} interests` };
  }
  if (input.interest_slugs.length > MAX_INTERESTS) {
    return { error: `Pick at most ${MAX_INTERESTS} interests` };
  }
  if (!Array.isArray(input.languages) || input.languages.length === 0) {
    return { error: 'Pick at least one language' };
  }
  if (input.languages.length > MAX_LANGUAGES) {
    return { error: `Pick at most ${MAX_LANGUAGES} languages` };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      city: input.city_name,
      city_id: input.city_id,
      country: input.country,
      interests: input.interest_slugs,
      languages: input.languages,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Used when the user closes the wizard without finishing it. We
 * don't penalise them — the next signed-in render that triggers
 * the onboarding layout will show the wizard again. Only useful
 * if you want to also surface a soft "skip for now" CTA.
 */
export async function skipOnboarding(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
