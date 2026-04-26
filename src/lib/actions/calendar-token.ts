'use server';

import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the current user's calendar subscription token, generating
 * one on first use. The token is what authenticates anonymous reads of
 * `/api/calendar/me/ical?token=...` from external calendar clients
 * (Google, Apple, Outlook, etc.).
 */
export async function ensureCalendarToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('calendar_token')
    .eq('id', user.id)
    .single();

  if (profile?.calendar_token) return profile.calendar_token;

  const token = randomBytes(24).toString('hex');
  const { error } = await supabase
    .from('profiles')
    .update({ calendar_token: token })
    .eq('id', user.id);

  if (error) return null;
  return token;
}

/**
 * Rotates the user's token, invalidating any previously-issued
 * subscription URLs. Useful when a URL has been shared by accident.
 */
export async function regenerateCalendarToken(): Promise<{
  token?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const token = randomBytes(24).toString('hex');
  const { error } = await supabase
    .from('profiles')
    .update({ calendar_token: token })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { token };
}
