'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signUp(formData: {
  email: string;
  password: string;
  displayName: string;
  locale: string;
  acceptedTerms: boolean;
  redirectTo?: string;
}) {
  if (!formData.acceptedTerms) {
    return { error: 'You must accept the Terms & Conditions and Privacy Policy' };
  }

  const supabase = await createClient();

  // Build the email confirmation callback URL, preserving redirectTo if present
  const callbackUrl = new URL(
    `${process.env.NEXT_PUBLIC_SITE_URL}/${formData.locale}/auth/callback`
  );
  if (formData.redirectTo && formData.redirectTo.startsWith('/')) {
    callbackUrl.searchParams.set('redirectTo', formData.redirectTo);
  }

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        display_name: formData.displayName,
        accepted_terms_at: new Date().toISOString(),
        accepted_privacy_at: new Date().toISOString(),
      },
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signIn(formData: {
  email: string;
  password: string;
  locale: string;
  redirectTo?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Redirect to the preserved destination (e.g. invite link) or homepage
  if (formData.redirectTo && formData.redirectTo.startsWith('/')) {
    redirect(`/${formData.locale}${formData.redirectTo}`);
  }

  redirect(`/${formData.locale}`);
}

export async function signInWithGoogle(locale: string, redirectTo?: string) {
  const supabase = await createClient();

  // Pass redirectTo through the OAuth callback so we can redirect after auth
  const callbackUrl = new URL(
    `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback`
  );
  if (redirectTo && redirectTo.startsWith('/')) {
    callbackUrl.searchParams.set('redirectTo', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export async function resetPassword(formData: { email: string; locale: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${formData.locale}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
