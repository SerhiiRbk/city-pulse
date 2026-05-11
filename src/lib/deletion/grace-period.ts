/**
 * Grace period calculation for account deletion.
 *
 * The grace period is exactly 720 hours (30 × 24 hours) from the deletion
 * request timestamp, regardless of timezone or daylight saving transitions.
 */

const GRACE_PERIOD_MS = 720 * 60 * 60 * 1000; // 720 hours in milliseconds

/**
 * Calculates the grace period end timestamp for an account deletion request.
 *
 * @param requestedAt - The timestamp when the deletion was requested
 * @returns A new Date exactly 720 hours (30 days) after requestedAt
 */
export function calculateGracePeriodEnd(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + GRACE_PERIOD_MS);
}
