import { Resend } from 'resend';

/**
 * Lazily-initialised Resend client. We don't construct one at module
 * load because:
 *   * the API key is only needed in cron / server actions — not on
 *     every request, and importing this file from a route handler
 *     shouldn't crash if the env var happens to be missing (e.g.
 *     in preview deploys where digest is intentionally disabled).
 *   * we want test and dev environments to be opt-in; without the
 *     key, `getResend()` returns `null` and callers must no-op.
 */
let cached: Resend | null | undefined;

export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

/**
 * Address the digest goes out as. Falls back to a sane default for
 * local dev where the env var may be missing — the cron itself
 * still no-ops without `RESEND_API_KEY`.
 */
export function getFromAddress(): string {
  return process.env.EMAIL_FROM_DIGEST || 'Localisio <digest@localisio.com>';
}
