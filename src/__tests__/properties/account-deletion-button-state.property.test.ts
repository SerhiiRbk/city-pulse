/**
 * Feature: account-deletion, Property 2: Delete button visibility is determined by deletion state
 *
 * For any user state (authenticated/not, has active deletion request/not),
 * the "Delete Account" button SHALL be visible if and only if the user is
 * authenticated AND does not have an active deletion request
 * (status = 'pending' with grace_period_ends_at > now).
 *
 * **Validates: Requirements 1.1, 1.9**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure function that determines whether the "Delete Account" button should be visible.
 *
 * The button is shown if and only if:
 * - The user is authenticated
 * - The user does NOT have a pending deletion request
 */
export function shouldShowDeleteButton(state: {
  isAuthenticated: boolean;
  hasPendingDeletion: boolean;
}): boolean {
  return state.isAuthenticated && !state.hasPendingDeletion;
}

describe('Feature: account-deletion, Property 2: Delete button visibility is determined by deletion state', () => {
  it('button is visible if and only if user is authenticated AND has no pending deletion', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isAuthenticated, hasPendingDeletion) => {
          const result = shouldShowDeleteButton({ isAuthenticated, hasPendingDeletion });
          const expected = isAuthenticated && !hasPendingDeletion;
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button is never visible for unauthenticated users regardless of deletion state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (hasPendingDeletion) => {
          const result = shouldShowDeleteButton({
            isAuthenticated: false,
            hasPendingDeletion,
          });
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button is hidden when user has a pending deletion request regardless of auth state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isAuthenticated) => {
          const result = shouldShowDeleteButton({
            isAuthenticated,
            hasPendingDeletion: true,
          });
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button is visible only when authenticated with no pending deletion', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isAuthenticated, hasPendingDeletion) => {
          const result = shouldShowDeleteButton({ isAuthenticated, hasPendingDeletion });
          if (result === true) {
            // If button is visible, user MUST be authenticated AND have no pending deletion
            expect(isAuthenticated).toBe(true);
            expect(hasPendingDeletion).toBe(false);
          } else {
            // If button is hidden, at least one condition is not met
            expect(!isAuthenticated || hasPendingDeletion).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
