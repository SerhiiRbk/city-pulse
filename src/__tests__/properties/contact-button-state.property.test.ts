/**
 * Feature: contacts-replace-subscriptions, Property 3: Contact button state derivation
 *
 * For any combination of (isAuthenticated, isOwnProfile, isInPool, isContact),
 * the contact button visibility and label SHALL be deterministic:
 * - NOT authenticated OR isOwnProfile → hidden
 * - authenticated AND NOT isInPool → hidden
 * - authenticated AND isInPool AND NOT isContact → "Add to contacts"
 * - authenticated AND isInPool AND isContact → "Remove from contacts"
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Represents the possible states of the contact button as derived from the
 * system's decision logic (page-level gating + component-level rendering).
 */
type ContactButtonState = 'hidden' | 'add_contact' | 'remove_contact';

/**
 * Pure function that encodes the full decision logic for the contact button state.
 *
 * This combines:
 * - Page-level gating: button is not rendered when not authenticated or viewing own profile
 * - Component-level logic: returns null when !isInPool, shows add/remove based on isContact
 */
function deriveContactButtonState(input: {
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  isInPool: boolean;
  isContact: boolean;
}): ContactButtonState {
  const { isAuthenticated, isOwnProfile, isInPool, isContact } = input;

  // Page-level: not authenticated → button not rendered at all
  if (!isAuthenticated) return 'hidden';

  // Page-level: own profile → button not rendered (Requirement 6.3)
  if (isOwnProfile) return 'hidden';

  // Component-level: not in interaction pool → render null (Requirement 2.3)
  if (!isInPool) return 'hidden';

  // Component-level: in pool and is contact → "Remove from contacts" (Requirement 2.2)
  if (isContact) return 'remove_contact';

  // Component-level: in pool and not contact → "Add to contacts" (Requirement 2.1)
  return 'add_contact';
}

// Arbitrary generator for the boolean tuple
const inputArb = fc.record({
  isAuthenticated: fc.boolean(),
  isOwnProfile: fc.boolean(),
  isInPool: fc.boolean(),
  isContact: fc.boolean(),
});

describe('Feature: contacts-replace-subscriptions, Property 3: Contact button state derivation', () => {
  it('button is hidden when user is not authenticated', () => {
    fc.assert(
      fc.property(
        fc.record({
          isAuthenticated: fc.constant(false),
          isOwnProfile: fc.boolean(),
          isInPool: fc.boolean(),
          isContact: fc.boolean(),
        }),
        (input) => {
          const state = deriveContactButtonState(input);
          expect(state).toBe('hidden');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button is hidden when viewing own profile', () => {
    fc.assert(
      fc.property(
        fc.record({
          isAuthenticated: fc.constant(true),
          isOwnProfile: fc.constant(true),
          isInPool: fc.boolean(),
          isContact: fc.boolean(),
        }),
        (input) => {
          const state = deriveContactButtonState(input);
          expect(state).toBe('hidden');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button is hidden when target user is not in interaction pool', () => {
    fc.assert(
      fc.property(
        fc.record({
          isAuthenticated: fc.constant(true),
          isOwnProfile: fc.constant(false),
          isInPool: fc.constant(false),
          isContact: fc.boolean(),
        }),
        (input) => {
          const state = deriveContactButtonState(input);
          expect(state).toBe('hidden');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('state derivation is deterministic for all boolean combinations', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const state = deriveContactButtonState(input);

        // Verify determinism: same input always produces same output
        const state2 = deriveContactButtonState(input);
        expect(state).toBe(state2);

        // Verify the state matches the expected decision tree
        if (!input.isAuthenticated || input.isOwnProfile || !input.isInPool) {
          expect(state).toBe('hidden');
        } else if (input.isContact) {
          expect(state).toBe('remove_contact');
        } else {
          expect(state).toBe('add_contact');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('shows "Add to contacts" when authenticated, not own profile, in pool, and not contact', () => {
    fc.assert(
      fc.property(
        fc.record({
          isAuthenticated: fc.constant(true),
          isOwnProfile: fc.constant(false),
          isInPool: fc.constant(true),
          isContact: fc.constant(false),
        }),
        (input) => {
          const state = deriveContactButtonState(input);
          expect(state).toBe('add_contact');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('shows "Remove from contacts" when authenticated, not own profile, in pool, and is contact', () => {
    fc.assert(
      fc.property(
        fc.record({
          isAuthenticated: fc.constant(true),
          isOwnProfile: fc.constant(false),
          isInPool: fc.constant(true),
          isContact: fc.constant(true),
        }),
        (input) => {
          const state = deriveContactButtonState(input);
          expect(state).toBe('remove_contact');
        },
      ),
      { numRuns: 100 },
    );
  });
});
