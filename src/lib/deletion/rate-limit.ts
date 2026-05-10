/**
 * Rate limiting logic for account deletion requests.
 *
 * Enforces a maximum of one deletion request per user per 24-hour rolling window.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Determines whether a new deletion request should be rate-limited based on
 * the timestamp of the last request.
 *
 * @param lastRequestAt - The timestamp of the user's most recent deletion request
 * @param newRequestAt - The timestamp of the new deletion request being attempted
 * @returns true if the request should be rejected (within 24-hour window), false if allowed
 */
export function isRateLimited(lastRequestAt: Date, newRequestAt: Date): boolean {
  const lastTime = lastRequestAt.getTime();
  const newTime = newRequestAt.getTime();

  // If either timestamp is invalid, treat as rate-limited (reject for safety)
  if (Number.isNaN(lastTime) || Number.isNaN(newTime)) {
    return true;
  }

  const diffMs = newTime - lastTime;
  return diffMs < TWENTY_FOUR_HOURS_MS;
}
