import { createClient } from '@supabase/supabase-js';

/**
 * Public anonymous Supabase client for cacheable Server Components and
 * `'use cache'` functions. Does NOT touch cookies() and therefore never
 * leaks the current user's session into the cache key. All reads are
 * subject to RLS policies evaluated under the `anon` role.
 *
 * Use this for home-page, city-events listings, SEO pages — anywhere the
 * data returned is the same for every visitor.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        // Avoid caching fetch responses in the Supabase SDK itself; we cache
        // at the Next.js layer via `'use cache'`.
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' } as RequestInit),
      },
    },
  );
}
