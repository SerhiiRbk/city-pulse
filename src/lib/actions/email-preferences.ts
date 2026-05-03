'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Toggles the weekly digest preference for the signed-in user.
 * Returns `{ enabled }` reflecting the new state on success.
 */
export async function setEmailDigestEnabled(
  enabled: boolean,
): Promise<{ enabled?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ email_digest_enabled: enabled })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/settings/email');
  return { enabled };
}

/**
 * Unsubscribes via the one-click token embedded in digest emails.
 *
 * This path runs against the service-role client so it works for
 * users who aren't currently signed in (the most common case for
 * email links).
 *
 * Returns `{ ok: true }` if a matching token existed and the
 * preference was flipped, otherwise `{ ok: false }`.
 */
export async function unsubscribeByToken(
  token: string,
  category: 'digest' | 'reminders' | 'marketing' = 'digest',
): Promise<{ ok: boolean; email?: string }> {
  if (!token || token.length < 16) return { ok: false };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('email_unsubscribe_tokens')
    .select('user_id')
    .eq('token', token)
    .eq('category', category)
    .maybeSingle();

  if (!row) return { ok: false };

  // Only the digest column exists today; reminders/marketing land
  // when those preferences are added.
  if (category === 'digest') {
    const { data: profile, error } = await admin
      .from('profiles')
      .update({ email_digest_enabled: false })
      .eq('id', row.user_id)
      .select('email')
      .single();
    if (error) return { ok: false };
    return { ok: true, email: profile?.email };
  }

  return { ok: true };
}
